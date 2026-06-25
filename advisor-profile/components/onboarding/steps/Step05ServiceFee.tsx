'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'
import TierCard, { type TierOption } from '@/components/onboarding/inputs/TierCard'

type Props = {
  value: string | null
  onChange: (tier: string) => void
}

const tiers: TierOption[] = [
  {
    id: 'standard',
    name: 'Standard',
    price: 'Free',
    description: 'Commission-based, no upfront fee',
    features: ['Basic trip planning', 'Hotel bookings', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$150',
    description: 'Dedicated advisor with premium support',
    features: [
      'Full itinerary planning',
      '24/7 support',
      'VIP perks & upgrades',
      'Price monitoring',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$500',
    description: 'White-glove concierge service',
    features: [
      'Everything in Pro',
      'Multi-destination planning',
      'On-trip concierge',
      'Exclusive experiences',
    ],
  },
]

export default function Step05ServiceFee({ value, onChange }: Props) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      aria-label="Service tier selection"
    >
      <motion.h2
        variants={staggerItemVariants}
        className="mb-6 text-xl font-bold"
        style={{ color: 'var(--ink, #1c1917)' }}
      >
        Choose your service tier
      </motion.h2>

      <motion.div variants={staggerItemVariants}>
        <TierCard options={tiers} selected={value} onChange={onChange} />
      </motion.div>
    </motion.div>
  )
}
