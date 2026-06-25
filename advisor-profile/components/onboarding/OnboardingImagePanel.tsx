'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { imageFadeVariants, imageFadeTransition } from '@/lib/motion/onboardingVariants'
import { getStepImageUrl, getStepImageAlt, getAdjacentImageUrls } from '@/lib/onboarding/images'

type Props = {
  stepIndex: number
  /** Override the step-level image with a selection-specific one */
  overrideImageUrl?: string
  overrideImageAlt?: string
}

export default function OnboardingImagePanel({ stepIndex, overrideImageUrl, overrideImageAlt }: Props) {
  const reduceMotion = useReducedMotion()
  const imageUrl = overrideImageUrl || getStepImageUrl(stepIndex)
  const imageAlt = overrideImageAlt || getStepImageAlt(stepIndex)

  const [nextReady, setNextReady] = useState(false)
  const adjacentUrls = getAdjacentImageUrls(stepIndex)

  useEffect(() => {
    setNextReady(false)
  }, [stepIndex])

  useEffect(() => {
    adjacentUrls.forEach((url) => {
      const img = new window.Image()
      img.src = url
    })
  }, [adjacentUrls])

  return (
    <div className="relative hidden w-[45%] shrink-0 overflow-hidden lg:block">
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
            priority={stepIndex === 0}
            sizes="(min-width: 1024px) 45vw, 0px"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, transparent 60%, rgba(255,255,255,0.04) 100%)',
            }}
            aria-hidden
          />
        </motion.div>
      </AnimatePresence>

      {/* Hidden prefetch for next step image */}
      {adjacentUrls[0] && (
        <Image
          key={`prefetch-${adjacentUrls[0]}`}
          src={adjacentUrls[0]}
          alt=""
          aria-hidden
          width={800}
          height={600}
          priority
          className="hidden"
          onLoad={() => setNextReady(true)}
        />
      )}
      {/* Belt-and-suspenders: warm cache for step+2 */}
      {adjacentUrls[1] && (
        <Image
          key={`prefetch2-${adjacentUrls[1]}`}
          src={adjacentUrls[1]}
          alt=""
          aria-hidden
          width={800}
          height={600}
          className="hidden"
        />
      )}

      {/* Expose readiness for parent if needed in future */}
      <span data-next-image-ready={nextReady} className="hidden" />
    </div>
  )
}
