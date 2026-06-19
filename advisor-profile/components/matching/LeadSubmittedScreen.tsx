'use client'

import { motion } from 'framer-motion'

type Props = {
  onDismiss: () => void
}

export default function LeadSubmittedScreen({ onDismiss }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border p-6 text-center shadow-sm"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h2 className="mb-2 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
        Request received
      </h2>

      <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
        We&apos;re reviewing your trip request. If everything checks out, we&apos;ll email you a
        secure link to start chatting with your advisor. Please check your inbox in the next few
        minutes.
      </p>

      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg px-5 py-2 text-sm font-medium transition-colors hover:opacity-90"
        style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
      >
        Back to results
      </button>
    </motion.div>
  )
}
