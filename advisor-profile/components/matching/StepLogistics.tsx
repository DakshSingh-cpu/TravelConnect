'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const VIBES = [
  { id: 'Relaxation', label: '🏖️ Relaxation' },
  { id: 'Culture', label: '🏛️ Culture' },
  { id: 'Adventure', label: '🥾 Adventure' },
  { id: 'Celebration', label: '🎉 Celebration' },
] as const

const PACES = [
  { id: 'Action-Packed', label: '⚡ Action-Packed' },
  { id: 'Balanced', label: '⚖️ Balanced' },
  { id: 'Slow Travel', label: '🐢 Slow Travel' },
] as const

const TIMINGS = [
  { id: 'Next 3 months', label: '📅 Next 3 months' },
  { id: 'Next 6 months', label: '📅 Next 6 months' },
  { id: 'Just dreaming', label: '💭 Just dreaming' },
] as const

const DURATIONS = [
  { id: '< 5 days', label: '⏱️ < 5 days' },
  { id: '1-2 weeks', label: '⏱️ 1-2 weeks' },
  { id: '2+ weeks', label: '⏱️ 2+ weeks' },
] as const

type LogisticsPayload = {
  vibe: string
  pace: string
  timing: string
  duration: string
}

type Props = {
  initialVibe?: string | null
  initialPace?: string | null
  initialTiming?: string | null
  initialDuration?: string | null
  onNext: (payload: LogisticsPayload) => void
  onBack?: () => void
}

function StepDots({ filled }: { filled: number }) {
  return (
    <div className="mb-8 flex justify-center gap-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-[7px] w-[7px] rounded-full transition-all duration-200 ease-out ${
            i < filled ? 'scale-125 bg-[#0F6E56]' : 'bg-[rgba(28,25,23,0.13)]'
          }`}
        />
      ))}
    </div>
  )
}

const optionBtn =
  'flex min-h-[3rem] items-center justify-center rounded-[9px] border px-3 py-3 text-center text-sm font-medium leading-snug shadow-[0_1px_3px_rgba(28,25,23,0.04)] transition-[border-color,background-color,transform] duration-150 will-change-transform hover:-translate-y-px hover:border-[rgba(15,110,86,0.30)] active:scale-[0.97]'

export default function StepLogistics({
  initialVibe = null,
  initialPace = null,
  initialTiming = null,
  initialDuration = null,
  onNext,
  onBack,
}: Props) {
  const [vibe, setVibe] = useState<string | null>(initialVibe)
  const [pace, setPace] = useState<string | null>(initialPace)
  const [timing, setTiming] = useState<string | null>(initialTiming)
  const [duration, setDuration] = useState<string | null>(initialDuration)

  const canContinue = Boolean(vibe && pace && timing && duration)

  return (
    <div className="mx-auto flex w-full max-w-[38rem] flex-col px-4 sm:px-6">
      <StepDots filled={3} />
      {onBack && (
        <button
          id="logistics-back"
          type="button"
          onClick={onBack}
          aria-label="Back to preferences step"
          className="mb-4 self-start text-sm text-stone-400 transition-colors hover:text-[#0F6E56]"
        >
          ← Back
        </button>
      )}
      <h2
        id="logistics-title"
        className="mb-2 text-center font-display text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] italic tracking-[-0.02em] text-stone-900"
      >
        Logistics &amp; vibe
      </h2>
      <p className="mx-auto mb-8 max-w-[26rem] text-center text-sm leading-relaxed text-stone-600">
        How you want to feel on the road — we use this to rank advisors who match your rhythm.
      </p>

      <fieldset className="mb-6 rounded-2xl border border-[var(--border)] p-5 shadow-[0_2px_8px_rgba(28,25,23,0.05)] backdrop-blur-md" style={{ background: 'var(--card-bg)' }}>
        <legend id="vibe-label" className="mb-3 px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-stone-500">
          Vibe
        </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="vibe-label">
            {VIBES.map((opt) => {
              const sel = vibe === opt.id
              return (
                <motion.button
                  key={opt.id}
                  id={`vibe-${opt.id.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  name="vibe"
                  value={opt.id}
                  aria-pressed={sel}
                  aria-label={opt.label}
                  onClick={() => setVibe(opt.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`${optionBtn} ${
                    sel
                      ? 'border-[rgba(15,110,86,0.38)] bg-[#E8F5EF] text-[#0F6E56]'
                      : 'border-[rgba(28,25,23,0.09)] bg-white text-stone-800'
                  }`}
                >
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
      </fieldset>

      <section className="mb-6">
        <div className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-stone-500" id="pace-label">
          Travel pace
        </div>
        <div
          className="rounded-2xl border border-[var(--border)] p-5 shadow-[0_2px_8px_rgba(28,25,23,0.05)] backdrop-blur-md"
          style={{ background: 'var(--card-bg)' }}
          role="group"
          aria-labelledby="pace-label"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PACES.map((opt) => {
              const sel = pace === opt.id
              return (
                <motion.button
                  key={opt.id}
                  id={`pace-${opt.id.toLowerCase().replace(/\s+/g, '-')}`}
                  name="pace"
                  value={opt.id}
                  aria-pressed={sel}
                  aria-label={opt.label}
                  type="button"
                  onClick={() => setPace(opt.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`${optionBtn} ${
                    sel
                      ? 'border-[rgba(15,110,86,0.38)] bg-[#E8F5EF] text-[#0F6E56]'
                      : 'border-[rgba(28,25,23,0.09)] bg-white text-stone-800'
                  }`}
                >
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-stone-500" id="timing-label">
          Timing
        </div>
        <div
          className="rounded-2xl border border-[var(--border)] p-5 shadow-[0_2px_8px_rgba(28,25,23,0.05)] backdrop-blur-md"
          style={{ background: 'var(--card-bg)' }}
          role="group"
          aria-labelledby="timing-label"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TIMINGS.map((opt) => {
              const sel = timing === opt.id
              return (
                <motion.button
                  key={opt.id}
                  id={`timing-${opt.id.toLowerCase().replace(/\s+/g, '-')}`}
                  name="timing"
                  value={opt.id}
                  aria-pressed={sel}
                  aria-label={opt.label}
                  type="button"
                  onClick={() => setTiming(opt.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`${optionBtn} ${
                    sel
                      ? 'border-[rgba(15,110,86,0.38)] bg-[#E8F5EF] text-[#0F6E56]'
                      : 'border-[rgba(28,25,23,0.09)] bg-white text-stone-800'
                  }`}
                >
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-stone-500" id="duration-label">
          Duration
        </div>
        <div
          className="rounded-2xl border border-[var(--border)] p-5 shadow-[0_2px_8px_rgba(28,25,23,0.05)] backdrop-blur-md"
          style={{ background: 'var(--card-bg)' }}
          role="group"
          aria-labelledby="duration-label"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DURATIONS.map((opt) => {
              const sel = duration === opt.id
              return (
                <motion.button
                  key={opt.id}
                  id={`duration-${opt.id.toLowerCase().replace(/\s+/g, '-')}`}
                  name="duration"
                  value={opt.id}
                  aria-pressed={sel}
                  aria-label={opt.label}
                  type="button"
                  onClick={() => setDuration(opt.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`${optionBtn} ${
                    sel
                      ? 'border-[rgba(15,110,86,0.38)] bg-[#E8F5EF] text-[#0F6E56]'
                      : 'border-[rgba(28,25,23,0.09)] bg-white text-stone-800'
                  }`}
                >
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="text-center">
        {canContinue && vibe && pace && timing && duration && (
          <motion.button
            id="logistics-continue"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => onNext({ vibe, pace, timing, duration })}
            className="relative inline-flex items-center justify-center rounded-[9px] border-0 bg-[#0F6E56] px-7 py-3.5 font-sans text-base font-semibold tracking-[0.005em] text-white transition-transform duration-150 will-change-transform after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[0_6px_24px_rgba(15,110,86,0.24),0_2px_8px_rgba(15,110,86,0.14)] after:opacity-0 after:transition-opacity after:duration-200 hover:bg-[#0C5A47] hover:after:opacity-100 active:scale-[0.97]"
          >
            Continue →
          </motion.button>
        )}
      </div>
    </div>
  )
}
