'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { chipHover, chipTap, chipSpring } from '@/lib/motion/onboardingVariants'
import AnimatedCheckmark from './AnimatedCheckmark'

export type ChipOption = {
  id: string
  label: string
  emoji?: string
}

type Props = {
  options: ChipOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  multi?: boolean
  columns?: number
  label?: string
}

export default function ChipSelect({
  options,
  selected,
  onChange,
  multi = false,
  columns = 2,
  label,
}: Props) {
  const reduceMotion = useReducedMotion()

  function handleClick(id: string) {
    if (multi) {
      const next = selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
      onChange(next)
    } else {
      onChange([id])
    }
  }

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
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        role={multi ? 'group' : 'radiogroup'}
        aria-label={label}
      >
        {options.map((opt) => {
          const sel = selected.includes(opt.id)
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => handleClick(opt.id)}
              aria-pressed={sel}
              whileHover={reduceMotion ? undefined : chipHover}
              whileTap={reduceMotion ? undefined : chipTap}
              transition={reduceMotion ? { duration: 0 } : chipSpring}
              className="flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center text-sm font-medium leading-snug shadow-[0_1px_3px_rgba(28,25,23,0.04)] transition-colors duration-150"
              style={{
                borderColor: sel
                  ? 'var(--teal, #0F6E56)'
                  : 'var(--border, rgba(28,25,23,0.09))',
                backgroundColor: sel
                  ? 'var(--teal-light, #E8F5EF)'
                  : 'var(--surface, #fff)',
                color: sel
                  ? 'var(--teal, #0F6E56)'
                  : 'var(--body, #44403c)',
              }}
            >
              {opt.emoji && (
                <span className="text-base" aria-hidden>
                  {opt.emoji}
                </span>
              )}
              <span>{opt.label}</span>
              <AnimatedCheckmark
                visible={sel}
                className="ml-auto shrink-0"
              />
            </motion.button>
          )
        })}
      </div>
    </fieldset>
  )
}
