'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'

const MAX_CHARS = 2000

type Props = {
  value: string
  onChange: (v: string) => void
}

export default function Step09AdditionalDetails({ value, onChange }: Props) {
  const remaining = MAX_CHARS - value.length

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.h2
        variants={staggerItemVariants}
        className="text-2xl font-bold tracking-tight"
        style={{ color: 'var(--ink, #1c1917)' }}
      >
        Are there any other details you'd like to share?
      </motion.h2>

      <motion.p
        variants={staggerItemVariants}
        className="text-sm"
        style={{ color: 'var(--muted, #78716c)' }}
      >
        This step is optional — skip it if you prefer.
      </motion.p>

      <motion.div variants={staggerItemVariants} className="flex flex-col gap-2">
        <label
          htmlFor="additional-details"
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          Additional details
        </label>
        <textarea
          id="additional-details"
          aria-label="Additional details"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) onChange(e.target.value)
          }}
          placeholder="Allergies, mobility needs, special occasions, dietary requirements — anything that helps us plan better."
          rows={5}
          className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-150 placeholder:opacity-50 focus:ring-2"
          style={{
            borderColor: 'var(--border, rgba(28,25,23,0.09))',
            backgroundColor: 'var(--surface, #fff)',
            color: 'var(--ink, #1c1917)',
            // @ts-expect-error CSS custom property for ring color
            '--tw-ring-color': 'var(--teal, #0F6E56)',
          }}
        />
        <span
          className="self-end text-xs tabular-nums"
          style={{ color: remaining < 100 ? 'var(--teal, #0F6E56)' : 'var(--muted, #78716c)' }}
          aria-live="polite"
        >
          {value.length}/{MAX_CHARS}
        </span>
      </motion.div>
    </motion.div>
  )
}
