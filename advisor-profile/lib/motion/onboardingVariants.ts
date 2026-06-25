import type { Variants, Transition } from 'framer-motion'

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number]

export const formSlideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
}

export const formSlideTransition: Transition = {
  duration: 0.35,
  ease: easeOut,
}

export const imageFadeVariants: Variants = {
  enter: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export const imageFadeTransition: Transition = {
  duration: 0.4,
  ease: 'easeInOut',
}

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
}

export const chipHover = { scale: 1.03 }
export const chipTap = { scale: 0.97 }
export const chipSpring: Transition = { type: 'spring', stiffness: 400, damping: 25 }

export const progressBarTransition: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 20,
}

export const buttonAppearVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

export const buttonAppearTransition: Transition = {
  duration: 0.25,
  ease: easeOut,
}
