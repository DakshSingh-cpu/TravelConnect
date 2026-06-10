'use client'

import type { ReactNode } from 'react'

type Segment =
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'p'; text: string }

/** Lightweight markdown for concierge replies (bold, headings, bullets). */
export default function ConciergeMessageBody({ text }: { text: string }) {
  const segments = parseSegments(text)

  return (
    <div className="space-y-2.5 text-[0.9375rem] leading-relaxed">
      {segments.map((segment, i) => {
        if (segment.kind === 'h3') {
          return (
            <h3
              key={i}
              className="mt-1 font-sans text-[0.6875rem] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--section-label)' }}
            >
              {formatInline(segment.text)}
            </h3>
          )
        }

        if (segment.kind === 'ul') {
          return (
            <ul key={i} className="ml-1 list-none space-y-2">
              {segment.items.map((item, j) => (
                <li key={j} className="flex gap-2.5" style={{ color: 'var(--body)' }}>
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: 'var(--teal)' }}
                    aria-hidden
                  />
                  <span>{formatInline(item)}</span>
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={i} style={{ color: 'var(--body)' }}>
            {formatInline(segment.text)}
          </p>
        )
      })}
    </div>
  )
}

function parseSegments(text: string): Segment[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const inlineBullets = splitInlineBulletParagraph(normalized)
  if (inlineBullets) {
    return [{ kind: 'ul', items: inlineBullets }]
  }

  const segments: Segment[] = []
  let bulletBuffer: string[] = []

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return
    segments.push({ kind: 'ul', items: [...bulletBuffer] })
    bulletBuffer = []
  }

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushBullets()
      continue
    }

    if (/^###\s+/.test(line)) {
      flushBullets()
      segments.push({ kind: 'h3', text: line.replace(/^###\s+/, '') })
      continue
    }

    if (/^[-*•]\s/.test(line)) {
      bulletBuffer.push(line.replace(/^[-*•]\s+/, ''))
      continue
    }

    flushBullets()
    segments.push({ kind: 'p', text: line })
  }

  flushBullets()
  return segments
}

/** Handles one-line replies like "* **Days 1–4:** Rome * **Day 5:** Train…" */
function splitInlineBulletParagraph(text: string): string[] | null {
  if (!/^\*+\s+\*\*/.test(text) && !/^\*\s+\*\*/.test(text)) return null
  const parts = text
    .split(/\s+(?=[-*•]\s+(?:\*\*|[A-Za-z]))/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  return parts.map((part) => part.replace(/^[-*•]\s+/, ''))
}

function formatInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold" style={{ color: 'var(--ink)' }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}
