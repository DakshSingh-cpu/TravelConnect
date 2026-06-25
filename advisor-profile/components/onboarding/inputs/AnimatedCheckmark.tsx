'use client'

import { motion, useReducedMotion } from 'framer-motion'

type Props = {
  visible: boolean
  className?: string
}

export default function AnimatedCheckmark({ visible, className = '' }: Props) {
  const reduceMotion = useReducedMotion()

  if (!visible) return null

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 ${className}`}
      initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 500, damping: 25 }
      }
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </motion.svg>
  )
}
