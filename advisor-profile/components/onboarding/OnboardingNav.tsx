'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { buttonAppearVariants, buttonAppearTransition } from '@/lib/motion/onboardingVariants'

type Props = {
  onBack?: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel?: string
  showBack?: boolean
}

export default function OnboardingNav({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = 'Continue',
  showBack = true,
}: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex items-center justify-between px-8 pb-6 pt-2 sm:px-10 lg:px-12">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium transition-colors hover:text-[var(--teal)]"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <motion.button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        variants={reduceMotion ? undefined : buttonAppearVariants}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
        transition={reduceMotion ? { duration: 0 } : buttonAppearTransition}
        className="relative inline-flex items-center justify-center rounded-xl border-0 px-7 py-3 font-sans text-sm font-semibold text-white transition-all duration-150 will-change-transform hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: nextDisabled
            ? 'var(--muted, #78716c)'
            : 'var(--teal, #0F6E56)',
        }}
      >
        {nextLabel} →
      </motion.button>
    </div>
  )
}
