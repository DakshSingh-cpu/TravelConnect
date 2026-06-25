'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'
import ChipSelect, { type ChipOption } from '@/components/onboarding/inputs/ChipSelect'

type Props = {
  selected: string[]
  onChange: (priorities: string[]) => void
}

const options: ChipOption[] = [
  { id: 'safari', label: 'Safari', emoji: '🦁' },
  { id: 'honeymoon', label: 'Honeymoon', emoji: '💍' },
  { id: 'accessibility', label: 'Accessibility', emoji: '♿' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘' },
  { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { id: 'foodie', label: 'Foodie', emoji: '🍜' },
  { id: 'family_friendly', label: 'Family friendly', emoji: '👨‍👩‍👧' },
  { id: 'pet_friendly', label: 'Pet friendly', emoji: '🐾' },
]

export default function Step06Priorities({ selected, onChange }: Props) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      aria-label="Trip priorities selection"
    >
      <motion.h2
        variants={staggerItemVariants}
        className="mb-1 text-xl font-bold"
        style={{ color: 'var(--ink, #1c1917)' }}
      >
        Any special trip details or priorities?
      </motion.h2>

      <motion.p
        variants={staggerItemVariants}
        className="mb-6 text-sm"
        style={{ color: 'var(--muted, #78716c)' }}
      >
        This is optional — skip if nothing stands out.
      </motion.p>

      <motion.div variants={staggerItemVariants}>
        <ChipSelect
          options={options}
          selected={selected}
          onChange={onChange}
          multi
          columns={2}
          label="Trip priorities"
        />
      </motion.div>
    </motion.div>
  )
}
