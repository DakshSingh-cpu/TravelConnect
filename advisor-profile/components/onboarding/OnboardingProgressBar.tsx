'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { progressBarTransition } from '@/lib/motion/onboardingVariants'
import { TOTAL_WIZARD_STEPS } from '@/lib/onboarding/steps'

type Props = {
  current: number
}

export default function OnboardingProgressBar({ current }: Props) {
  const reduceMotion = useReducedMotion()
  const ratio = Math.min(1, Math.max(0, current / TOTAL_WIZARD_STEPS))

  return (
    <div className="flex items-center gap-3 px-8 pb-0 pt-5">
      <div
        className="relative h-1.5 flex-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={TOTAL_WIZARD_STEPS}
        aria-label={`Step ${current} of ${TOTAL_WIZARD_STEPS}`}
        style={{ background: 'var(--border, rgba(28,25,23,0.08))' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'var(--teal, #0F6E56)',
            width: '100%',
            transformOrigin: 'left',
          }}
          animate={{ scaleX: ratio }}
          transition={reduceMotion ? { duration: 0 } : progressBarTransition}
          initial={false}
          layout={false}
        />
      </div>
      <span
        className="shrink-0 text-xs font-semibold tabular-nums"
        style={{ color: 'var(--muted, #78716c)' }}
      >
        {current}/{TOTAL_WIZARD_STEPS}
      </span>
    </div>
  )
}
