'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { chipHover, chipTap, chipSpring } from '@/lib/motion/onboardingVariants'
import AnimatedCheckmark from './AnimatedCheckmark'

export type TierOption = {
  id: string
  name: string
  price: string
  description: string
  features: string[]
  recommended?: boolean
}

type Props = {
  options: TierOption[]
  selected: string | null
  onChange: (id: string) => void
}

export default function TierCard({ options, selected, onChange }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3" role="radiogroup" aria-label="Service tier">
      {options.map((tier) => {
        const sel = selected === tier.id
        return (
          <motion.button
            key={tier.id}
            type="button"
            onClick={() => onChange(tier.id)}
            aria-pressed={sel}
            whileHover={reduceMotion ? undefined : chipHover}
            whileTap={reduceMotion ? undefined : chipTap}
            transition={reduceMotion ? { duration: 0 } : chipSpring}
            className="relative flex flex-col items-start rounded-2xl border p-6 text-left shadow-[0_2px_8px_rgba(28,25,23,0.05)] transition-colors duration-150"
            style={{
              borderColor: sel
                ? 'var(--teal, #0F6E56)'
                : 'var(--border, rgba(28,25,23,0.09))',
              backgroundColor: sel
                ? 'var(--teal-light, #E8F5EF)'
                : 'var(--surface, #fff)',
            }}
          >
            {tier.recommended && (
              <span
                className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ background: 'var(--teal, #0F6E56)' }}
              >
                Recommended
              </span>
            )}
            <div className="flex w-full items-start justify-between">
              <div>
                <div
                  className="text-base font-bold"
                  style={{
                    color: sel ? 'var(--teal, #0F6E56)' : 'var(--ink, #1c1917)',
                  }}
                >
                  {tier.name}
                </div>
                <div
                  className="mt-0.5 text-lg font-semibold"
                  style={{ color: 'var(--teal, #0F6E56)' }}
                >
                  {tier.price}
                </div>
              </div>
              <AnimatedCheckmark visible={sel} className="shrink-0 mt-1" />
            </div>
            <p
              className="mt-2 text-xs leading-relaxed"
              style={{ color: 'var(--muted, #78716c)' }}
            >
              {tier.description}
            </p>
            <ul className="mt-3 flex flex-col gap-1">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-1.5 text-xs"
                  style={{ color: 'var(--body, #44403c)' }}
                >
                  <span style={{ color: 'var(--teal, #0F6E56)' }} aria-hidden>
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </motion.button>
        )
      })}
    </div>
  )
}
