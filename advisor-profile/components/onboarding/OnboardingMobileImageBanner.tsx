'use client'

import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { imageFadeVariants, imageFadeTransition } from '@/lib/motion/onboardingVariants'
import { getStepImageUrl, getStepImageAlt } from '@/lib/onboarding/images'

type Props = {
  stepIndex: number
  /** Override the step-level image with a selection-specific one */
  overrideImageUrl?: string
  overrideImageAlt?: string
}

export default function OnboardingMobileImageBanner({ stepIndex, overrideImageUrl, overrideImageAlt }: Props) {
  const reduceMotion = useReducedMotion()
  const imageUrl = overrideImageUrl || getStepImageUrl(stepIndex)
  const imageAlt = overrideImageAlt || getStepImageAlt(stepIndex)

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={imageUrl}
        className="absolute inset-0"
        variants={reduceMotion ? undefined : imageFadeVariants}
        initial={reduceMotion ? false : 'enter'}
        animate="visible"
        exit="exit"
        transition={reduceMotion ? { duration: 0 } : imageFadeTransition}
      >
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="100vw"
          priority={stepIndex === 0}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3) 100%)',
          }}
          aria-hidden
        />
      </motion.div>
    </AnimatePresence>
  )
}
