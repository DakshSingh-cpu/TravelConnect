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
  attribution: string | null
  attributionOther?: string
  onAttributionChange: (v: string) => void
  onOtherChange: (v: string) => void
}

const sources: RadioOption[] = [
  { id: 'google', label: 'Google', emoji: '🔍' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'facebook', label: 'Facebook', emoji: '👍' },
  { id: 'friend', label: 'A friend', emoji: '🤝' },
  { id: 'blog', label: 'Blog / Article', emoji: '📝' },
  { id: 'other', label: 'Other', emoji: '💡' },
]

export default function Step11Attribution({
  attribution,
  attributionOther = '',
  onAttributionChange,
  onOtherChange,
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
        Last question — where did you hear about us?
      </motion.h2>

      <motion.div variants={staggerItemVariants}>
        <RadioCardList
          options={sources}
          selected={attribution}
          onChange={onAttributionChange}
          label="How did you find us?"
        />
      </motion.div>

      {attribution === 'other' && (
        <motion.div
          variants={staggerItemVariants}
          initial="hidden"
          animate="show"
        >
          <label
            htmlFor="attribution-other"
            className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
            style={{ color: 'var(--muted, #78716c)' }}
          >
            Please tell us more
          </label>
          <input
            id="attribution-other"
            type="text"
            value={attributionOther}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Where did you hear about us?"
            aria-label="Other attribution details"
            maxLength={200}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-150 placeholder:opacity-50 focus:ring-2"
            style={{
              borderColor: 'var(--border, rgba(28,25,23,0.09))',
              backgroundColor: 'var(--surface, #fff)',
              color: 'var(--ink, #1c1917)',
              // @ts-expect-error CSS custom property for ring color
              '--tw-ring-color': 'var(--teal, #0F6E56)',
            }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
