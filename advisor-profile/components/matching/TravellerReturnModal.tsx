'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { readMatchSession } from '@/lib/matchSession'
import AuthModal from '@/components/auth/AuthModal'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'

type Props = {
  open: boolean
  onClose: () => void
  /** Called when the user wants to go to their previous chats */
  onGoToChat: () => void
  /** Called when user wants to start a completely fresh journey (no sign-in required) */
  onFreshStart: () => void
  /** Called when user has signed in fresh and should proceed */
  onFreshSignedIn: () => void
  /** If provided, overrides the default start step when the modal opens */
  initialStep?: 'selection' | 'post_login'
}

export default function TravellerReturnModal({
  open,
  onClose,
  onGoToChat,
  onFreshStart,
  onFreshSignedIn,
  initialStep = 'selection',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [hasPreviousSession, setHasPreviousSession] = useState(false)
  const { user } = useSupabaseSession()
  const reduceMotion = useReducedMotion()

  type ModalStep = 'selection' | 'post_login'
  const [step, setStep] = useState<ModalStep>('selection')

  useEffect(() => {
    setMounted(true)
    // Check if there's a previous match session to resume
    const session = readMatchSession()
    setHasPreviousSession(!!session)
  }, [])

  useEffect(() => {
    if (open) {
      setStep(initialStep)
    }
  }, [open, initialStep])

  if (!mounted) return null

  const previousDestination = (() => {
    try {
      const session = readMatchSession()
      return session?.intake?.destination ?? null
    } catch {
      return null
    }
  })()

  const overlayVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  }

  const panelVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 24 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0 }
        : { type: 'spring' as const, damping: 26, stiffness: 320 },
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      y: 16,
      transition: { duration: reduceMotion ? 0 : 0.18 },
    },
  }


  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="traveller-return-title"
          variants={reduceMotion ? undefined : overlayVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            className="absolute inset-0 cursor-default"
            style={{ background: 'rgba(15, 12, 10, 0.52)', backdropFilter: 'blur(6px)' }}
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow:
                '0 32px 80px rgba(15,12,10,0.22), 0 8px 32px rgba(15,12,10,0.12)',
            }}
            variants={reduceMotion ? undefined : panelVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {/* Ambient top glow */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(15,110,86,0.28) 0%, transparent 70%)',
              }}
              aria-hidden
            />

            <div className="relative px-7 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-9">
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-black/8"
                style={{ color: 'var(--muted)' }}
                aria-label="Close"
              >
                ✕
              </button>

              {/* Header */}
              {step === 'selection' ? (
                <div className="mb-7 text-center">
                  <span
                    className="mb-3 inline-block rounded-full px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
                    style={{
                      background: 'var(--teal-light)',
                      color: 'var(--teal)',
                    }}
                  >
                    Welcome back ✈️
                  </span>
                  <h2
                    id="traveller-return-title"
                    className="font-display text-[1.6rem] leading-[1.15] tracking-tight sm:text-3xl"
                    style={{ color: 'var(--ink)' }}
                  >
                    How would you like
                    <br />
                    to continue?
                  </h2>
                  <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    Pick up where you left off, or start a brand-new journey.
                  </p>
                </div>
              ) : (
                <div className="mb-7 text-center">
                  <span
                    className="mb-3 inline-block rounded-full px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
                    style={{
                      background: 'var(--teal-light)',
                      color: 'var(--teal)',
                    }}
                  >
                    You're signed in
                  </span>
                  <h2
                    id="traveller-return-title"
                    className="font-display text-[1.6rem] leading-[1.15] tracking-tight sm:text-3xl"
                    style={{ color: 'var(--ink)' }}
                  >
                    What's next?
                  </h2>
                  <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    Would you like to review your previous chats, or start a new journey?
                  </p>
                </div>
              )}

              {/* Option Cards */}
              <div className="flex flex-col gap-3.5">
                {step === 'selection' ? (
                  <>
                    {/* Option 1: Previous user */}
                <motion.button
                  id="traveller-continue-previous-btn"
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: 0.15, duration: 0.4, ease: 'easeOut' }}
                  whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    if (user) {
                      setStep('post_login')
                    } else {
                      setShowAuthModal(true)
                    }
                  }}
                  className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-shadow hover:shadow-[0_8px_32px_rgba(15,110,86,0.14)]"
                  style={{
                    background: hasPreviousSession
                      ? 'linear-gradient(135deg, rgba(15,110,86,0.06) 0%, rgba(15,110,86,0.02) 100%)'
                      : 'var(--surface-2)',
                    borderColor: hasPreviousSession
                      ? 'rgba(15,110,86,0.22)'
                      : 'var(--border)',
                  }}
                >
                  {/* Hover shimmer */}
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)',
                    }}
                    aria-hidden
                  />

                  {/* Icon */}
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, var(--teal), #0a5a46)',
                      boxShadow: '0 4px 16px rgba(15,110,86,0.3)',
                    }}
                  >
                    🔄
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
                      Continue as previous traveller
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      {hasPreviousSession && previousDestination
                        ? <>Resume your <strong style={{ color: 'var(--ink)' }}>{previousDestination}</strong> search — pick up your chats or explore new matches.</>
                        : 'Sign back in to pick up your previous chats and explore new journey matches.'}
                    </p>
                    {hasPreviousSession && (
                      <span
                        className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold"
                        style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
                      >
                        ✓ Previous journey found
                      </span>
                    )}
                  </div>

                  <span
                    className="mt-1 shrink-0 text-lg opacity-40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80"
                    style={{ color: 'var(--teal)' }}
                    aria-hidden
                  >
                    →
                  </span>

                  {/* Bottom accent */}
                  <span
                    className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full"
                    style={{ background: 'linear-gradient(90deg, var(--teal), #0a5a46)' }}
                    aria-hidden
                  />
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
                  <span
                    className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    or
                  </span>
                  <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
                </div>

                {/* Option 2: Fresh user */}
                <motion.button
                  id="traveller-fresh-start-btn"
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: 0.25, duration: 0.4, ease: 'easeOut' }}
                  whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    onFreshStart()
                  }}
                  className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-shadow hover:shadow-[0_8px_24px_rgba(28,25,23,0.1)]"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {/* Hover shimmer */}
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
                    }}
                    aria-hidden
                  />

                  {/* Icon */}
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #6b5d3f, #4a3e28)',
                      boxShadow: '0 4px 16px rgba(107,93,63,0.25)',
                    }}
                  >
                    ✨
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
                      {user ? 'Start a new journey' : 'Sign in as a new traveller'}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      {user
                        ? 'Begin fresh — discover new destinations and find your perfect advisor match.'
                        : 'Create a new account or sign in with a different account to start your journey.'}
                    </p>
                  </div>

                  <span
                    className="mt-1 shrink-0 text-lg opacity-40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80"
                    style={{ color: 'var(--muted)' }}
                    aria-hidden
                  >
                    →
                  </span>

                  {/* Bottom accent */}
                  <span
                    className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full"
                    style={{ background: 'linear-gradient(90deg, #6b5d3f, #a08050)' }}
                    aria-hidden
                  />
                </motion.button>

                {/* Skip / explore without account */}
                <p className="pt-1 text-center text-xs" style={{ color: 'var(--muted)' }}>
                  Just browsing?{' '}
                  <button
                    id="traveller-skip-signin-btn"
                    type="button"
                    className="font-semibold underline-offset-2 hover:underline"
                    style={{ color: 'var(--teal)' }}
                    onClick={onFreshStart}
                  >
                    Continue without signing in →
                  </button>
                </p>
              </>
            ) : (
              <>
                {/* Post Login Option 1: Open chats */}
                <motion.button
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: 0.15, duration: 0.4, ease: 'easeOut' }}
                  whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onGoToChat}
                  className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-shadow hover:shadow-[0_8px_32px_rgba(15,110,86,0.14)]"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm" style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }}>
                    💬
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug" style={{ color: 'var(--ink)' }}>Open previous chats</p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Continue your conversation with the advisors you were talking to.</p>
                  </div>
                  <span className="mt-1 shrink-0 text-lg opacity-40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80" style={{ color: 'var(--teal)' }} aria-hidden>→</span>
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full" style={{ background: 'linear-gradient(90deg, var(--teal), #0a5a46)' }} aria-hidden />
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
                  <span
                    className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    or
                  </span>
                  <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
                </div>

                {/* Post Login Option 2: New journey */}
                <motion.button
                  type="button"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: 0.25, duration: 0.4, ease: 'easeOut' }}
                  whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onFreshSignedIn}
                  className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-shadow hover:shadow-[0_8px_24px_rgba(28,25,23,0.1)]"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm" style={{ background: 'linear-gradient(135deg, #6b5d3f, #4a3e28)', boxShadow: '0 4px 16px rgba(107,93,63,0.25)' }}>
                    ✨
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug" style={{ color: 'var(--ink)' }}>Start a new journey</p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Discover new destinations and find another perfect match.</p>
                  </div>
                  <span className="mt-1 shrink-0 text-lg opacity-40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-80" style={{ color: 'var(--muted)' }} aria-hidden>→</span>
                  <span className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full" style={{ background: 'linear-gradient(90deg, #6b5d3f, #a08050)' }} aria-hidden />
                </motion.button>
              </>
            )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {createPortal(modalContent, document.body)}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={() => {
          setShowAuthModal(false)
          setStep('post_login')
        }}
        accountRole="traveller"
        nextUrl="/?resume_traveller=true"
        title="Welcome, traveller"
        subtitle="Sign in or create an account to save your matches and message advisors."
      />
    </>
  )
}
