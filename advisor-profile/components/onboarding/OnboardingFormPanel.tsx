'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { formSlideVariants, formSlideTransition } from '@/lib/motion/onboardingVariants'

type Props = {
  stepKey: string
  direction: number
  children: React.ReactNode
}

export default function OnboardingFormPanel({ stepKey, direction, children }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={reduceMotion ? undefined : formSlideVariants}
          initial={reduceMotion ? false : 'enter'}
          animate="center"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : formSlideTransition}
          className="flex flex-1 flex-col overflow-y-auto px-8 py-10 sm:px-10 lg:px-12"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
