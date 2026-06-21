'use client'

import { useEffect, useState } from 'react'
import { readSessionTelemetry } from '@/lib/telemetry/collector'
import type { SessionTelemetryPayload } from '@/lib/telemetry/types'
import type { UIMessage } from 'ai'
import { getTextFromUIMessage } from '@/lib/chatMessages'

// ─── Lightweight client-side score estimator (mirrors scoreLead.ts logic) ────
// This is for testing/debug only. The real score is computed server-side.

type RuleResult = {
  label: string
  delta: number
  hardBlock: boolean
  status: 'good' | 'warn' | 'block' | 'neutral'
}

const TRAVEL_DATE_PATTERNS = [
  // Named months: January, Feb, march…
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  /\b(jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i,
  // Full date formats only (must include year): 12/25/2025, 5-7-2026
  /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/,
  // Standalone 4-digit year
  /\b20[2-9]\d\b/,
  // Relative time: next month, this summer, next year…
  /\b(next|this)\s+(month|week|year|summer|winter|spring|autumn|fall)\b/i,
  // Quarter references
  /\b(q[1-4]|quarter)\b/i,
  // "in 2026", "around July 2026", "for March"
  /\b(around|in|for)\s+(\w+\s+)?\d{4}\b/i,
  // "early March", "mid-December", "late summer"
  /\b(early|mid|late)[- ]?(january|february|march|april|may|june|july|august|september|october|november|december|summer|winter|spring|autumn|fall|year)\b/i,
  // Explicit date phrases
  /\bfixed dates?\b/i,
  /\bmy dates\b/i,
  /\btravel(?:ling|ing)?\s+(in|on|around|during)\b/i,
  // Flexible explicitly stated
  /\b(dates? are flexible|flexible dates?|open dates?)\b/i,
]

const BOOKING_INTENT_PATTERNS = [
  // Strong booking signals
  /\b(ready to book|want to book|looking to book|planning to book|let'?s book)\b/i,
  // Requesting pricing or quotes
  /\b(price|pricing|cost|quote|how much|what(?:'s| is) the (price|cost|rate))\b/i,
  // Requesting availability
  /\bavailability\b/i,
  // Explicitly requesting a human
  /\b(connect|speak|talk|chat)\s+(to|with)\s+(a|an|your)\s+(human|advisor|expert|agent|person)\b/i,
  // Confirmation readiness
  /\b(let'?s (do|go|proceed)|i'?m ready|ready to (proceed|confirm|go ahead))\b/i,
  // Reserve/confirm in travel context
  /\b(reserve|confirm)\s+(a |the |my )?(trip|hotel|booking|flight|package)\b/i,
]

const DEFLECTION_PATTERNS = [
  /\b(not sure|i don'?t know|maybe|just (looking|exploring|browsing|dreaming)|tbd|someday|just checking)\b/i,
  /\b(no idea|haven'?t decided|undecided|not (yet|really))\b/i,
]

function analyzeConversation(messages: UIMessage[]): {
  hasTravelDates: boolean
  hasBookingIntent: boolean
  hasDeflections: boolean
} {
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .map((m) => getTextFromUIMessage(m).toLowerCase())
  const combined = userMessages.join(' ')

  const hasTravelDates = TRAVEL_DATE_PATTERNS.some((re) => re.test(combined))
  const hasBookingIntent = BOOKING_INTENT_PATTERNS.some((re) => re.test(combined))
  const hasDeflections = DEFLECTION_PATTERNS.some((re) => re.test(combined))

  return { hasTravelDates, hasBookingIntent, hasDeflections }
}

function computeDebugScore(t: SessionTelemetryPayload, userTurns: number, messages: UIMessage[]): {
  score: number
  rules: RuleResult[]
  decision: 'pass' | 'block'
} {
  const rules: RuleResult[] = []
  let base = 50
  let hardBlock = false

  // VELOCITY_TRAP_TOTAL
  if (t.totalFunnelMs > 0 && t.totalFunnelMs < 4000) {
    rules.push({ label: 'Speed: too fast (< 4s total)', delta: -50, hardBlock: true, status: 'block' })
    base -= 50; hardBlock = true
  } else {
    rules.push({ label: 'Speed: normal pace', delta: 0, hardBlock: false, status: 'good' })
  }

  // PASTE_BOT
  if (t.conciergeMetrics.pasteDetected && t.totalFunnelMs < 60_000) {
    rules.push({ label: 'Copy-paste detected', delta: -35, hardBlock: true, status: 'block' })
    base -= 35; hardBlock = true
  } else if (t.conciergeMetrics.pasteDetected) {
    rules.push({ label: 'Copy-paste (slow session, ignored)', delta: 0, hardBlock: false, status: 'warn' })
  } else {
    rules.push({ label: 'No paste detected ✓', delta: 0, hardBlock: false, status: 'good' })
  }

  // HESITATION_STDDEV (desktop only)
  if (t.deviceClass !== 'mobile' && userTurns >= 2) {
    const std = t.conciergeMetrics.hesitationPauseStdDevMs
    if (std !== null) {
      if (std < 20) {
        rules.push({ label: `Typing rhythm too uniform (σ=${std?.toFixed(0)}ms)`, delta: -40, hardBlock: true, status: 'block' })
        base -= 40; hardBlock = true
      } else if (std < 40) {
        rules.push({ label: `Typing rhythm slightly robotic (σ=${std?.toFixed(0)}ms)`, delta: -15, hardBlock: false, status: 'warn' })
        base -= 15
      } else {
        rules.push({ label: `Natural typing rhythm ✓ (σ=${std?.toFixed(0)}ms)`, delta: 5, hardBlock: false, status: 'good' })
        base += 5
      }
    } else {
      rules.push({ label: 'Typing rhythm: not enough data yet', delta: 0, hardBlock: false, status: 'neutral' })
    }
  }

  // CHAT TURNS
  if (userTurns === 0) {
    rules.push({ label: 'Chat turns: 0 (no messages yet)', delta: 0, hardBlock: false, status: 'warn' })
  } else if (userTurns < 3) {
    rules.push({ label: `Chat turns: ${userTurns} (need ≥ 3 for handoff)`, delta: 0, hardBlock: false, status: 'warn' })
  } else {
    rules.push({ label: `Chat turns: ${userTurns} ✓`, delta: 0, hardBlock: false, status: 'good' })
  }

  // TRAVEL DATES — key required signal
  if (messages.length > 0) {
    const { hasTravelDates, hasBookingIntent, hasDeflections } = analyzeConversation(messages)

    if (hasTravelDates) {
      rules.push({ label: 'Travel dates mentioned ✓', delta: 10, hardBlock: false, status: 'good' })
      base += 10
    } else {
      rules.push({ label: 'Travel dates: not yet mentioned', delta: -10, hardBlock: false, status: 'warn' })
      base -= 10
    }

    if (hasBookingIntent) {
      rules.push({ label: 'Booking intent detected ✓', delta: 10, hardBlock: false, status: 'good' })
      base += 10
    } else {
      rules.push({ label: 'Booking intent: not yet expressed', delta: -5, hardBlock: false, status: 'warn' })
      base -= 5
    }

    if (hasDeflections) {
      rules.push({ label: 'Deflection phrases detected ("not sure", "just looking"…)', delta: -15, hardBlock: false, status: 'block' })
      base -= 15
    }
  }

  // SESSION DURATION
  const mins = t.totalFunnelMs / 60_000
  if (mins < 0.5) {
    rules.push({ label: `Session time: ${(t.totalFunnelMs / 1000).toFixed(0)}s (very short)`, delta: 0, hardBlock: false, status: 'warn' })
  } else {
    rules.push({ label: `Session time: ${mins.toFixed(1)} min ✓`, delta: 0, hardBlock: false, status: 'good' })
  }

  const score = Math.min(100, Math.max(0, Math.round(base)))
  const threshold = 55
  const decision: 'pass' | 'block' = hardBlock || score < threshold ? 'block' : 'pass'

  return { score, rules, decision }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  userTurns: number
  messages?: UIMessage[]
}

const STATUS_COLORS = {
  good: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  warn: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  block: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  neutral: { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' },
}

export default function IntentScoreDebugPanel({ userTurns, messages = [] }: Props) {
  const [telemetry, setTelemetry] = useState<SessionTelemetryPayload | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  // Only show in dev or when ?debug=1 is in the URL
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development'
    const isDebugParam = new URLSearchParams(window.location.search).get('debug') === '1'
    setIsVisible(isDev || isDebugParam)
  }, [])

  // Poll telemetry every second
  useEffect(() => {
    if (!isVisible) return
    const interval = setInterval(() => {
      setTelemetry(readSessionTelemetry())
    }, 1000)
    setTelemetry(readSessionTelemetry())
    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible || !telemetry) return null

  const { score, rules, decision } = computeDebugScore(telemetry, userTurns, messages)

  const scoreColor =
    decision === 'block'
      ? '#ef4444'
      : score >= 70
        ? '#10b981'
        : '#f59e0b'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        width: '280px',
        fontFamily: 'monospace',
        fontSize: '11px',
        borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.15)',
        background: 'rgba(15,23,42,0.93)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        color: '#e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen((o) => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px' }}>🧪</span>
          <span style={{ fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8' }}>
            DEV · INTENT SCORE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Score badge */}
          <span
            style={{
              fontWeight: 900,
              fontSize: '14px',
              color: scoreColor,
              letterSpacing: '-0.02em',
            }}
          >
            {score}/100
          </span>
          <span style={{ color: '#475569', fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '10px 12px' }}>
          {/* Decision banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: '6px',
              marginBottom: '10px',
              background: decision === 'pass' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${decision === 'pass' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <span style={{ color: decision === 'pass' ? '#34d399' : '#f87171', fontWeight: 700 }}>
              {decision === 'pass' ? '✅ LIKELY PASS' : '🚫 LIKELY BLOCK'}
            </span>
            <span style={{ color: '#64748b', fontSize: '10px' }}>threshold: 55</span>
          </div>

          {/* Score bar */}
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                height: '6px',
                borderRadius: '99px',
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${score}%`,
                  background: scoreColor,
                  borderRadius: '99px',
                  transition: 'width 0.5s ease, background 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '3px',
                color: '#475569',
                fontSize: '9px',
              }}
            >
              <span>0</span>
              <span style={{ color: '#f59e0b' }}>55 (pass)</span>
              <span>100</span>
            </div>
          </div>

          {/* Rules list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {rules.map((rule, i) => {
              const colors = STATUS_COLORS[rule.status]
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    padding: '4px 7px',
                    borderRadius: '5px',
                    background: colors.bg + '22',
                    border: `1px solid ${colors.dot}33`,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: colors.dot,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  />
                  <span style={{ color: '#cbd5e1', lineHeight: 1.4 }}>{rule.label}</span>
                  {rule.delta !== 0 && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        flexShrink: 0,
                        fontWeight: 700,
                        color: rule.delta > 0 ? '#34d399' : '#f87171',
                      }}
                    >
                      {rule.delta > 0 ? '+' : ''}{rule.delta}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Raw telemetry */}
          <div
            style={{
              marginTop: '10px',
              padding: '6px 8px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            <div>⌨️ keystrokes: {telemetry.conciergeMetrics.keystrokeIntervalsMs?.length ?? 0}</div>
            <div>💬 turns: {userTurns}</div>
            <div>⏱ session: {(telemetry.totalFunnelMs / 1000).toFixed(0)}s</div>
            <div>📱 device: {telemetry.deviceClass}</div>
            <div>📋 paste: {telemetry.conciergeMetrics.pasteDetected ? '⚠️ YES' : 'no'}</div>
          </div>

          <div
            style={{
              marginTop: '6px',
              color: '#334155',
              fontSize: '9px',
              textAlign: 'center',
            }}
          >
            Live estimate · real score computed server-side on submit
          </div>
        </div>
      )}
    </div>
  )
}
