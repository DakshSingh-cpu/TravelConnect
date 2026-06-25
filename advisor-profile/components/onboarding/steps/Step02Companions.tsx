'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'
import ChipSelect, { type ChipOption } from '@/components/onboarding/inputs/ChipSelect'

type Props = {
  companions: string | null
  partySize: number
  onCompanionsChange: (c: string) => void
  onPartySizeChange: (n: number) => void
}

const companionOptions: ChipOption[] = [
  { id: 'solo', label: 'Solo', emoji: '🧳' },
  { id: 'partner', label: 'Partner', emoji: '💑' },
  { id: 'kids', label: 'Kids', emoji: '👨‍👩‍👧' },
  { id: 'friends', label: 'Friends', emoji: '👯' },
]

export default function Step02Companions({
  companions,
  partySize,
  onCompanionsChange,
  onPartySizeChange,
}: Props) {
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
        Who&apos;s coming with?
      </motion.h2>

      <motion.div variants={staggerItemVariants}>
        <ChipSelect
          options={companionOptions}
          selected={companions ? [companions] : []}
          onChange={(selected) => {
            if (selected.length > 0) {
              onCompanionsChange(selected[0])
            }
          }}
          multi={false}
          columns={2}
          label="Travel companions"
        />
      </motion.div>

      <motion.div variants={staggerItemVariants}>
        <label
          htmlFor="party-size"
          className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          Party size
        </label>
        <input
          id="party-size"
          type="number"
          min={1}
          max={50}
          value={partySize}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n)) onPartySizeChange(n)
          }}
          aria-label="Party size"
          className="w-full max-w-[8rem] rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-150 focus:ring-2"
          style={{
            borderColor: 'var(--border, rgba(28,25,23,0.09))',
            backgroundColor: 'var(--surface, #fff)',
            color: 'var(--ink, #1c1917)',
            // @ts-expect-error CSS custom property for ring color
            '--tw-ring-color': 'var(--teal, #0F6E56)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}
