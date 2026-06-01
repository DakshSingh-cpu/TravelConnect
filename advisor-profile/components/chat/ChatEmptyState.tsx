'use client'

import Link from 'next/link'

type Props = {
  variant: 'advisor' | 'traveller'
  advisorRouteId?: string | null
  /** Signed in as advisor path but not linked to agency yet */
  needsAdvisorLink?: boolean
}

export default function ChatEmptyState({ variant, advisorRouteId, needsAdvisorLink }: Props) {
  const isAdvisor = variant === 'advisor'

  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-12 text-center"
      style={{ background: 'var(--cream)' }}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-display text-white"
        style={{ background: 'var(--teal)' }}
      >
        {isAdvisor ? '💼' : 'T'}
      </div>

      <h2 className="font-display text-xl" style={{ color: 'var(--ink)' }}>
        {isAdvisor ? 'Client inbox' : 'Your messages'}
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
        {isAdvisor
          ? 'Select a conversation on the left to read and reply to traveller messages. New chats appear when a client contacts you from your profile.'
          : 'Select a conversation on the left, or start a new chat from your matched advisors.'}
      </p>

      {isAdvisor && needsAdvisorLink && (
        <p className="mt-4 max-w-sm text-xs leading-relaxed rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--surface)' }}>
          Open the <strong style={{ color: 'var(--ink)' }}>TA</strong> menu (top right) and tap{' '}
          <strong style={{ color: 'var(--teal)' }}>Enable Advisor Mode (Demo)</strong> to link your account to your
          agency profile.
        </p>
      )}

      {isAdvisor ? (
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          {advisorRouteId && !needsAdvisorLink && (
            <>
              <Link
                href="/advisor/me/profile"
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
                style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
              >
                Edit introduction &amp; video
              </Link>
              <Link
                href={`/advisor/${advisorRouteId}`}
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[rgba(15,110,86,0.06)]"
                style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}
              >
                View public profile
              </Link>
            </>
          )}
        </div>
      ) : (
        <Link
          href="/"
          className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
        >
          Find an advisor
        </Link>
      )}
    </div>
  )
}
