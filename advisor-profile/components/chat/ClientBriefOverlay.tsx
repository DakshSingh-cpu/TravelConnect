'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AdvisorBriefPanel from '@/components/AdvisorBriefPanel'
import ClientBriefBanner from '@/components/chat/ClientBriefBanner'
import type { AdvisorBrief } from '@/lib/advisorBrief'

type Props = {
  open: boolean
  onClose: () => void
  brief: AdvisorBrief | null
  loading: boolean
  travelerName: string
  travelerAvatarUrl: string | null
}

function TravelerAvatar({ name, url, layoutId }: { name: string; url: string | null; layoutId?: string }) {
  const initial = name.charAt(0).toUpperCase()

  if (url) {
    return (
      <motion.img
        layoutId={layoutId}
        src={url}
        alt=""
        className="h-12 w-12 rounded-full object-cover"
      />
    )
  }

  return (
    <motion.div
      layoutId={layoutId}
      className="flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white"
      style={{ background: 'var(--teal)' }}
    >
      {initial}
    </motion.div>
  )
}

export default function ClientBriefOverlay({
  open,
  onClose,
  brief,
  loading,
  travelerName,
  travelerAvatarUrl,
}: Props) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const backdropTransition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' as const }
  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, damping: 30, stiffness: 340, mass: 0.85 }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition}
          role="dialog"
          aria-modal="true"
          aria-label={`Client brief for ${travelerName}`}
        >
          <motion.button
            type="button"
            aria-label="Close client brief"
            className="absolute inset-0 z-0 bg-stone-900/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={onClose}
          />

          <motion.div
            className="absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden"
            style={{ background: 'var(--cream)' }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={panelTransition}
          >
            <header
              className="flex shrink-0 items-center gap-3 border-b px-4 py-4"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <TravelerAvatar
                name={travelerName}
                url={travelerAvatarUrl}
                layoutId={reduceMotion ? undefined : 'client-brief-avatar'}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold" style={{ color: 'var(--ink)' }}>
                  {travelerName}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Client brief · TravelConnect traveller
                </p>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--teal)' }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                aria-label="Close"
              >
                Done
              </motion.button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <motion.div
                className="mx-auto w-full max-w-2xl"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: 0.08, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {loading && <ClientBriefBanner variant="loading" />}
                {!loading && brief && <AdvisorBriefPanel brief={brief} unbounded />}
                {!loading && !brief && <ClientBriefBanner variant="empty" />}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
