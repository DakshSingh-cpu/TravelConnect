'use client'

import { useMemo, useState } from 'react'

const MIN_L = 5
const MAX_L = 50
const STEP = 0.5

function formatLakh(n: number): string {
  const v = Math.round(n * 2) / 2
  if (Math.abs(v - Math.round(v)) < 0.01) return String(Math.round(v))
  return String(v)
}

function budgetLabel(lakh: number): string {
  return `₹${formatLakh(lakh)}L`
}

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
  initialBudgetLakh?: number
  onNext: (budgetLakh: number) => void
  onBack?: () => void
}

export default function StepBudget({ initialBudgetLakh = 15, onNext, onBack }: Props) {
  const [budgetLakh, setBudgetLakh] = useState(initialBudgetLakh)

  const fillRatio = useMemo(() => {
    return Math.min(1, Math.max(0, (budgetLakh - MIN_L) / (MAX_L - MIN_L)))
  }, [budgetLakh])

  function clampBudget(v: number) {
    return Math.min(MAX_L, Math.max(MIN_L, v))
  }

  function onSliderChange(v: string) {
    const n = parseFloat(v)
    if (Number.isNaN(n)) return
    setBudgetLakh(clampBudget(n))
  }

  function onInputBlur() {
    setBudgetLakh((prev) => clampBudget(prev))
  }

  function onNumberChange(raw: string) {
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return
    setBudgetLakh(clampBudget(n))
  }

  return (
    <div className="mx-auto flex w-full max-w-[38rem] flex-col px-4 sm:px-6">
      <StepDots filled={2} total={3} />
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to destination step"
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
        What&apos;s your trip budget?
      </h2>
      <p
        className="mx-auto mb-8 max-w-[26rem] text-center text-sm leading-relaxed"
        style={{ color: 'var(--body)' }}
      >
        Slide to set your total trip spend — we&apos;ll match advisors in range.
      </p>

      <fieldset
        className="mb-8 rounded-2xl border border-transparent p-6 shadow-[0_2px_8px_rgba(28,25,23,0.05),0_1px_3px_rgba(28,25,23,0.04)] backdrop-blur-md"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <legend
          id="budget-label"
          className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
          style={{ color: 'var(--subtle)' }}
        >
          Trip budget (₹ Lakhs)
        </legend>
        <div
          className="mb-4 text-center font-display text-xl tracking-[-0.015em]"
          aria-live="polite"
          style={{ color: 'var(--teal)' }}
        >
          {budgetLabel(budgetLakh)}
        </div>
        <div className="relative mb-4 h-2.5 rounded-full bg-[var(--teal-light)]">
          <span
            className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full origin-left rounded-full bg-[var(--teal)] transition-transform duration-75 ease-out"
            style={{ transform: `scaleX(${fillRatio})` }}
            aria-hidden="true"
          />
          <label htmlFor="budget-slider" className="sr-only">
            Trip budget in lakhs
          </label>
          <input
            id="budget-slider"
            type="range"
            min={MIN_L}
            max={MAX_L}
            step={STEP}
            value={budgetLakh}
            onChange={(e) => onSliderChange(e.target.value)}
            aria-valuemin={MIN_L}
            aria-valuemax={MAX_L}
            aria-valuenow={budgetLakh}
            aria-labelledby="budget-label"
            className="relative z-10 h-2.5 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[2.5px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--teal)] [&::-moz-range-thumb]:shadow-[0_2px_10px_rgba(15,110,86,0.28)] [&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[2.5px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--teal)] [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(15,110,86,0.28)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 active:[&::-webkit-slider-thumb]:scale-110"
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <label htmlFor="budget-exact-input" className="text-sm" style={{ color: 'var(--body)' }}>
            Exact amount
          </label>
          <input
            id="budget-exact-input"
            type="number"
            min={MIN_L}
            max={MAX_L}
            step={STEP}
            value={formatLakh(budgetLakh)}
            inputMode="decimal"
            onChange={(e) => onNumberChange(e.target.value)}
            onBlur={onInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onInputBlur()
              }
            }}
            className="w-28 rounded-[9px] border border-transparent bg-[var(--surface-2)] px-3 py-2 text-center font-sans text-base transition-colors focus:border-[var(--teal)] focus:outline-none focus:ring-[3px] focus:ring-[rgba(15,110,86,0.10)]"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          />
        </div>
        <p
          className="mt-3 text-center text-[0.6875rem] leading-snug"
          style={{ color: 'var(--muted)' }}
        >
          Slide or type between ₹5L and ₹50L (total trip budget).
        </p>
      </fieldset>

      <div className="text-center">
        <button
          type="button"
          onClick={() => onNext(budgetLakh)}
          className="relative inline-flex items-center justify-center rounded-[9px] border-0 bg-[var(--teal)] px-7 py-3.5 font-sans text-base font-semibold tracking-[0.005em] text-white transition-transform duration-150 will-change-transform after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[0_6px_24px_rgba(15,110,86,0.24),0_2px_8px_rgba(15,110,86,0.14)] after:opacity-0 after:transition-opacity after:duration-200 hover:bg-[var(--teal-hover)] hover:after:opacity-100 active:scale-[0.97]"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
