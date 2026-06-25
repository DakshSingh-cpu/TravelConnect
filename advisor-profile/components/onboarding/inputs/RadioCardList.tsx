'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { chipHover, chipTap, chipSpring } from '@/lib/motion/onboardingVariants'
import AnimatedCheckmark from './AnimatedCheckmark'

export type RadioOption = {
  id: string
  label: string
  description?: string
  emoji?: string
}

type Props = {
  options: RadioOption[]
  selected: string | null
  onChange: (id: string) => void
  label?: string
}

export default function RadioCardList({ options, selected, onChange, label }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <fieldset className="border-0 p-0">
      {label && (
        <legend
          className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          {label}
        </legend>
      )}
      <div className="flex flex-col gap-3" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const sel = selected === opt.id
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={sel}
              whileHover={reduceMotion ? undefined : chipHover}
              whileTap={reduceMotion ? undefined : chipTap}
              transition={reduceMotion ? { duration: 0 } : chipSpring}
              className="flex items-center gap-4 rounded-xl border px-5 py-4 text-left shadow-[0_1px_3px_rgba(28,25,23,0.04)] transition-colors duration-150"
              style={{
                borderColor: sel
                  ? 'var(--teal, #0F6E56)'
                  : 'var(--border, rgba(28,25,23,0.09))',
                backgroundColor: sel
                  ? 'var(--teal-light, #E8F5EF)'
                  : 'var(--surface, #fff)',
              }}
            >
              {opt.emoji && (
                <span className="shrink-0 text-xl" aria-hidden>
                  {opt.emoji}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm font-semibold"
                  style={{
                    color: sel
                      ? 'var(--teal, #0F6E56)'
                      : 'var(--ink, #1c1917)',
                  }}
                >
                  {opt.label}
                </div>
                {opt.description && (
                  <div
                    className="mt-0.5 text-xs leading-relaxed"
                    style={{ color: 'var(--muted, #78716c)' }}
                  >
                    {opt.description}
                  </div>
                )}
              </div>
              <AnimatedCheckmark
                visible={sel}
                className="shrink-0"
              />
            </motion.button>
          )
        })}
      </div>
    </fieldset>
  )
}
