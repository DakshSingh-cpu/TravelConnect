'use client'

import { useEffect, useRef, useState } from 'react'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import { buildMockMatchedAdvisors, defaultIntakePayload, parseIntakeBody } from '@/lib/matchAdvisors'

const CHECK_ITEMS = [
  { icon: '🌍', text: 'Filtering by destination expertise and regional knowledge' },
  { icon: '📖', text: 'Checking booking history — advisors with 50+ verified trips' },
  { icon: '💰', text: 'Matching advisors in your exact budget range' },
  { icon: '⭐', text: 'Verifying traveler reviews and satisfaction scores' },
  { icon: '✅', text: 'Confirming TravelConnect-verified booking credentials' },
] as const

const REDIRECT_MS = CHECK_ITEMS.length * 100 + 300
const SPINNER_HIDE_MS = CHECK_ITEMS.length * 100 + 100

type Props = {
  intake: MatchIntakePayload | null
  advisorBrief?: AdvisorBrief | null
  onComplete: (advisors: EnrichedMatchedAdvisor[]) => void
}

function readIntakeFromSession(): MatchIntakePayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('tbo_match_intake')
    if (!raw) return null
    const o = JSON.parse(raw) as unknown
    return parseIntakeBody(o)
  } catch {
    return null
  }
}

async function fetchMatches(
  payload: MatchIntakePayload,
  brief?: AdvisorBrief | null,
): Promise<EnrichedMatchedAdvisor[]> {
  const res = await fetch('/api/match-advisors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, advisorBrief: brief ?? undefined }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error((errData as { error?: string }).error || 'match request failed')
  }
  const data = (await res.json()) as { advisors?: EnrichedMatchedAdvisor[] }
  // Fall back to mock (without enrichment) if API returns unexpected shape
  if (Array.isArray(data.advisors) && data.advisors.length > 0) return data.advisors
  return buildMockMatchedAdvisors(payload).map((a) => ({ ...a, agentProfile: null }))
}

function StepDots() {
  return (
    <div className="mb-8 flex justify-center gap-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-[7px] w-[7px] scale-125 rounded-full transition-all duration-200 ease-out"
          style={{ backgroundColor: 'var(--teal)' }}
        />
      ))}
    </div>
  )
}

export default function StepMatching({ intake, advisorBrief, onComplete }: Props) {
  const [visible, setVisible] = useState<boolean[]>(() => CHECK_ITEMS.map(() => false))
  const [showSpinner, setShowSpinner] = useState(true)
  const finished = useRef(false)
  const matchPromise = useRef<Promise<EnrichedMatchedAdvisor[]> | null>(null)

  useEffect(() => {
    const payload = intake ?? readIntakeFromSession() ?? defaultIntakePayload()
    matchPromise.current = fetchMatches(payload, advisorBrief).catch((err) => {
      console.error('[StepMatching] matchAgencies API error:', err.message ?? err)
      return buildMockMatchedAdvisors(payload, advisorBrief).map((a) => ({ ...a, agentProfile: null }))
    })
  }, [intake, advisorBrief])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    CHECK_ITEMS.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisible((prev) => {
            const next = [...prev]
            next[i] = true
            return next
          })
        }, 50 + i * 100),
      )
    })

    timers.push(
      setTimeout(() => {
        setShowSpinner(false)
      }, SPINNER_HIDE_MS),
    )

    timers.push(
      setTimeout(async () => {
        if (finished.current) return
        finished.current = true
        const advisors = (await matchPromise.current) ?? buildMockMatchedAdvisors(defaultIntakePayload()).map((a) => ({ ...a, agentProfile: null }))
        onComplete(advisors)
      }, REDIRECT_MS),
    )

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [onComplete])

  return (
    <div className="flex w-full max-w-[30rem] flex-col items-center justify-center px-4 py-8 sm:px-6">
      <StepDots />
      <div
        className="w-full max-w-[28rem] rounded-2xl border border-transparent p-8 px-6 shadow-[0_8px_36px_rgba(28,25,23,0.10),0_3px_10px_rgba(28,25,23,0.06)] backdrop-blur-md"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <h2
          id="match-title"
          className="mb-6 text-center font-display text-xl italic leading-snug tracking-[-0.015em]"
          style={{ color: 'var(--ink)' }}
        >
          Finding your perfect match…
        </h2>
        {showSpinner && (
          <div
            className="mx-auto mb-6 h-9 w-9 animate-spin rounded-full border-[2.5px] border-[var(--teal-light)] border-t-[var(--teal)]"
            role="status"
            aria-label="Loading"
          />
        )}
        {!showSpinner && <div className="mb-6 h-9" aria-hidden="true" />}
        <ul className="flex flex-col gap-4">
          {CHECK_ITEMS.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 text-sm transition-all duration-[380ms] ease-out ${
                visible[i] ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
              }`}
              style={{ color: 'var(--ink)' }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem]"
                aria-hidden="true"
                style={{ backgroundColor: 'var(--teal-light)', color: 'var(--teal)' }}
              >
                {item.icon}
              </span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
          Preparing your top advisor matches…
        </p>
      </div>
    </div>
  )
}
