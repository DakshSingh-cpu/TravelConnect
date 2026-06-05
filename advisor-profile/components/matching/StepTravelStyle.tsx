'use client'

import { useState } from 'react'

const STYLES = [
  { id: 'Couple', label: '💑 Couple' },
  { id: 'Family', label: '👪 Family' },
  { id: 'Solo', label: '🧳 Solo' },
  { id: 'Friends', label: '👫 Friends' },
  { id: 'Business', label: '💼 Business' },
  { id: 'Group', label: '👥 Large Group' },
] as const

function StepDots({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="mb-8 flex justify-center gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-[7px] w-[7px] rounded-full transition-all duration-200 ease-out ${
            i < filled ? 'scale-125' : ''
          }`}
          style={{
            backgroundColor: i < filled ? 'var(--teal)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

type Props = {
  initialTravelStyle?: string | null
  onNext: (travelStyle: string) => void
  onBack?: () => void
}

export default function StepTravelStyle({ initialTravelStyle = null, onNext, onBack }: Props) {
  const [travelStyle, setTravelStyle] = useState<string | null>(initialTravelStyle)

  return (
    <div className="mx-auto flex w-full max-w-[38rem] flex-col px-4 sm:px-6">
      <StepDots filled={3} total={3} />
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to budget step"
          className="mb-4 self-start text-sm transition-colors hover:text-[var(--teal)]"
          style={{ color: 'var(--muted)' }}
        >
          ← Back
        </button>
      )}
      <h2
        className="mb-2 text-center font-display text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] italic tracking-[-0.02em]"
        style={{ color: 'var(--ink)' }}
      >
        Who&apos;s travelling?
      </h2>
      <p
        className="mx-auto mb-8 max-w-[26rem] text-center text-sm leading-relaxed"
        style={{ color: 'var(--body)' }}
      >
        Pick your travel style — then we connect you with your AI concierge.
      </p>

      <fieldset className="mb-6 border-0 p-0">
        <legend className="sr-only">Travel style</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Travel style">
          {STYLES.map((s) => {
            const sel = travelStyle === s.id
            return (
              <button
                key={s.id}
                type="button"
                name="travelStyle"
                value={s.id}
                aria-pressed={sel}
                aria-label={s.label}
                onClick={() => setTravelStyle(s.id)}
                className="flex min-h-[2.75rem] items-center justify-center rounded-[9px] border px-3 py-2.5 text-center text-sm font-medium leading-snug shadow-[0_1px_3px_rgba(28,25,23,0.04),0_1px_2px_rgba(28,25,23,0.03)] transition-all duration-150 will-change-transform hover:-translate-y-px hover:border-[var(--teal)] active:scale-[0.97]"
                style={{
                  borderColor: sel ? 'var(--teal)' : 'var(--border)',
                  backgroundColor: sel ? 'var(--teal-light)' : 'var(--surface)',
                  color: sel ? 'var(--teal)' : 'var(--body)',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="text-center">
        {travelStyle && (
          <button
            type="button"
            onClick={() => travelStyle && onNext(travelStyle)}
            className="relative inline-flex items-center justify-center rounded-[9px] border-0 bg-[var(--teal)] px-7 py-3.5 font-sans text-base font-semibold tracking-[0.005em] text-white transition-transform duration-150 will-change-transform after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[0_6px_24px_rgba(15,110,86,0.24),0_2px_8px_rgba(15,110,86,0.14)] after:opacity-0 after:transition-opacity after:duration-200 hover:bg-[var(--teal-hover)] hover:after:opacity-100 active:scale-[0.97]"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  )
}
