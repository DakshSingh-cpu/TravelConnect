'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'

type Props = {
  onContinue: () => void
}

export default function StepThankYou({ onContinue }: Props) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return

    import('canvas-confetti').then((mod) =>
      mod.default({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      }),
    ).catch(() => {
      /* canvas-confetti not available — silently skip */
    })
  }, [reduceMotion])

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-6 py-10 text-center"
    >
      {/* Celebration icon */}
      <motion.div
        variants={staggerItemVariants}
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--teal-light, #E8F5EF)' }}
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10"
          style={{ color: 'var(--teal, #0F6E56)' }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>

      <motion.h2
        variants={staggerItemVariants}
        className="text-3xl font-extrabold tracking-tight"
        style={{ color: 'var(--ink, #1c1917)' }}
      >
        Thank you!
      </motion.h2>

      <motion.p
        variants={staggerItemVariants}
        className="max-w-sm text-base leading-relaxed"
        style={{ color: 'var(--body, #44403c)' }}
      >
        Your profile is ready. Let&apos;s start shaping your trip.
      </motion.p>

      <motion.button
        variants={staggerItemVariants}
        type="button"
        onClick={onContinue}
        aria-label="Start Planning"
        className="mt-4 rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-md transition-opacity duration-150 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: 'var(--teal, #0F6E56)',
          // @ts-expect-error CSS custom property for ring color
          '--tw-ring-color': 'var(--teal, #0F6E56)',
        }}
      >
        Start Planning
      </motion.button>
    </motion.div>
  )
}
