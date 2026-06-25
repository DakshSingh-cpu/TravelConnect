'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'
import RadioCardList, {
  type RadioOption,
} from '@/components/onboarding/inputs/RadioCardList'

type Props = {
  value: string | null
  onChange: (v: string) => void
}

const serviceLevelOptions: RadioOption[] = [
  { id: 'hotel', label: 'Book a hotel', emoji: '🏨' },
  { id: 'cruise', label: 'Book a cruise', emoji: '🚢' },
  { id: 'full_itinerary', label: 'Plan full itinerary', emoji: '🗺️' },
  { id: 'flights_only', label: 'Flights only', emoji: '✈️' },
  { id: 'other', label: 'Something else', emoji: '💬' },
]

export default function Step04ServiceLevel({ value, onChange }: Props) {
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
        What kind of help do you need?
      </motion.h2>

      <motion.div variants={staggerItemVariants}>
        <RadioCardList
          options={serviceLevelOptions}
          selected={value}
          onChange={onChange}
          label="Service type"
        />
      </motion.div>
    </motion.div>
  )
}
