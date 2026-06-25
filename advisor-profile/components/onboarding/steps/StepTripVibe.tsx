'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
  chipHover,
  chipTap,
  chipSpring,
} from '@/lib/motion/onboardingVariants'
import AnimatedCheckmark from '@/components/onboarding/inputs/AnimatedCheckmark'

type VibeOption = {
  id: string
  label: string
  emoji: string
  description: string
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'scenic_nature',
    label: 'Scenic nature',
    emoji: '🌿',
    description: 'Forests, valleys, national parks',
  },
  {
    id: 'somewhere_warm',
    label: 'Somewhere warm',
    emoji: '☀️',
    description: 'Sun, heat, blue skies',
  },
  {
    id: 'city_culture',
    label: 'City & culture',
    emoji: '🏛️',
    description: 'Museums, architecture, food',
  },
  {
    id: 'beach_islands',
    label: 'Beach & islands',
    emoji: '🏝️',
    description: 'Sand, sea, island hopping',
  },
  {
    id: 'mountains',
    label: 'Mountains',
    emoji: '⛰️',
    description: 'Peaks, skiing, alpine views',
  },
  {
    id: 'coastal_escape',
    label: 'Coastal escape',
    emoji: '🌊',
    description: 'Cliffs, boats, sea air',
  },
]

type Props = {
  value: string | undefined
  onChange: (vibe: string) => void
}

export default function StepTripVibe({ value, onChange }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={staggerItemVariants}>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--ink, #1c1917)' }}
        >
          What kind of trip are you dreaming about?
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted, #78716c)' }}>
          Pick the vibe that feels right — skip if you&apos;re not sure yet.
        </p>
      </motion.div>

      <motion.div
        variants={staggerItemVariants}
        className="grid grid-cols-2 gap-3"
        role="radiogroup"
        aria-label="Trip vibe"
      >
        {VIBE_OPTIONS.map((opt) => {
          const selected = value === opt.id
          return (
            <motion.button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.id)}
              whileHover={reduceMotion ? undefined : chipHover}
              whileTap={reduceMotion ? undefined : chipTap}
              transition={reduceMotion ? { duration: 0 } : chipSpring}
              className="flex min-h-[5.5rem] flex-col items-start justify-between rounded-2xl border p-4 text-left shadow-[0_1px_4px_rgba(28,25,23,0.05)] transition-colors duration-150"
              style={{
                borderColor: selected
                  ? 'var(--teal, #0F6E56)'
                  : 'var(--border, rgba(28,25,23,0.09))',
                backgroundColor: selected
                  ? 'var(--teal-light, #E8F5EF)'
                  : 'var(--surface, #fff)',
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-2xl leading-none" aria-hidden>
                  {opt.emoji}
                </span>
                <AnimatedCheckmark visible={selected} className="shrink-0 mt-0.5" />
              </div>
              <div>
                <div
                  className="text-sm font-semibold leading-snug"
                  style={{
                    color: selected
                      ? 'var(--teal, #0F6E56)'
                      : 'var(--ink, #1c1917)',
                  }}
                >
                  {opt.label}
                </div>
                <div
                  className="mt-0.5 text-[0.6875rem] leading-snug"
                  style={{ color: 'var(--muted, #78716c)' }}
                >
                  {opt.description}
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
