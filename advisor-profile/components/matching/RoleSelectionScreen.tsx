'use client'

import { motion, useReducedMotion } from 'framer-motion'

type Props = {
  onTraveller: () => void
  onAdvisor: () => void
}

const easeOut = [0.22, 1, 0.36, 1] as const

const headerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
}

const lineVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeOut },
  },
}

const cardContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.35 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, damping: 22, stiffness: 280 },
  },
}

export default function RoleSelectionScreen({ onTraveller, onAdvisor }: Props) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-8">
      {/* Ambient background motion */}
      {!reduceMotion && (
        <>
          <motion.div
            className="pointer-events-none absolute -left-24 top-[12%] h-72 w-72 rounded-full blur-3xl"
            style={{ background: 'rgba(15, 110, 86, 0.18)' }}
            animate={{ x: [0, 28, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="pointer-events-none absolute -right-16 bottom-[18%] h-64 w-64 rounded-full blur-3xl"
            style={{ background: 'rgba(186, 117, 23, 0.1)' }}
            animate={{ x: [0, -22, 0], y: [0, 14, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[8%] h-48 w-[min(90%,520px)] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'rgba(225, 245, 238, 0.85)' }}
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      <motion.div
        className="relative z-10 mb-10 max-w-xl text-center"
        variants={reduceMotion ? undefined : headerVariants}
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
      >
        <motion.p
          variants={reduceMotion ? undefined : lineVariants}
          className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--section-label)' }}
        >
          Welcome to TravelConnect
        </motion.p>
        <motion.h1
          variants={reduceMotion ? undefined : lineVariants}
          className="font-display text-4xl leading-[1.12] tracking-tight sm:text-[2.75rem]"
          style={{ color: 'var(--ink)' }}
        >
          What brings you here today?
        </motion.h1>
        <motion.p
          variants={reduceMotion ? undefined : lineVariants}
          className="mx-auto mt-4 max-w-md text-sm leading-relaxed sm:text-[0.9375rem]"
          style={{ color: 'var(--muted)' }}
        >
          Get matched with a verified travel advisor—or sign in to reply to clients and manage your
          profile.
        </motion.p>
      </motion.div>

      <motion.div
        className="relative z-10 grid w-full max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2"
        variants={reduceMotion ? undefined : cardContainerVariants}
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
      >
        <RoleCard
          reduceMotion={reduceMotion}
          id="role-traveller-btn"
          icon="✈️"
          title="I am a Traveller"
          description="Find your perfect travel advisor matched to your destination, budget & style."
          cta="Start matching →"
          onClick={onTraveller}
          accent="traveller"
        />
        <RoleCard
          reduceMotion={reduceMotion}
          id="role-advisor-btn"
          icon="💼"
          title="I am a Travel Advisor"
          description="Sign in to your advisor dashboard, manage client chats and update your profile."
          cta="Go to inbox →"
          onClick={onAdvisor}
          accent="advisor"
        />
      </motion.div>
    </div>
  )
}

function RoleCard({
  id,
  icon,
  title,
  description,
  cta,
  onClick,
  accent,
  reduceMotion,
}: {
  id: string
  icon: string
  title: string
  description: string
  cta: string
  onClick: () => void
  accent: 'traveller' | 'advisor'
  reduceMotion: boolean | null
}) {
  return (
    <motion.button
      id={id}
      type="button"
      variants={reduceMotion ? undefined : cardVariants}
      onClick={onClick}
      whileHover={reduceMotion ? undefined : { y: -6, scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border p-7 text-left shadow-[0_4px_24px_rgba(28,25,23,0.06)] hover:border-[rgba(15,110,86,0.25)] hover:shadow-[0_16px_48px_rgba(15,110,86,0.16)]"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Hover shine */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
        }}
        aria-hidden
      />

      <motion.span
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-md"
        style={{
          background:
            accent === 'traveller'
              ? 'linear-gradient(135deg, var(--teal), #0a5a46)'
              : 'linear-gradient(135deg, #1a7a60, #0a5a46)',
        }}
        animate={
          reduceMotion
            ? undefined
            : { y: [0, -4, 0], rotate: accent === 'traveller' ? [0, -2, 0] : [0, 2, 0] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: accent === 'advisor' ? 0.6 : 0 }
        }
      >
        {icon}
      </motion.span>

      <div className="relative">
        <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>
          {title}
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {description}
        </p>
      </div>

      <span
        className="relative mt-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 group-hover:gap-2 group-hover:px-3.5"
        style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
      >
        {cta}
      </span>

      {/* Bottom accent line on hover */}
      <span
        className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full"
        style={{ background: 'linear-gradient(90deg, var(--teal), #0a5a46)' }}
        aria-hidden
      />
    </motion.button>
  )
}
