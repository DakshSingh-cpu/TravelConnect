'use client'

import Link from 'next/link'
import UserProfileButton from '@/components/auth/UserProfileButton'

export default function GlobalHeader() {
  return (
    <header
      className="sticky top-0 z-50 flex h-[3.25rem] shrink-0 items-center border-b border-transparent backdrop-blur-md backdrop-saturate-[130%]"
      role="banner"
      style={{
        backgroundColor: 'var(--header-bg)',
        borderBottomColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-wide text-teal-brand">
          TravelConnect
        </Link>
        <nav className="flex items-center gap-4" aria-label="Site">
          <Link
            href="/advisors"
            className="text-[0.6875rem] uppercase tracking-[0.08em] transition-colors hover:text-[var(--teal)]"
            style={{ color: 'var(--muted)' }}
          >
            Advisors
          </Link>
          <span
            className="text-[0.6875rem] uppercase tracking-[0.08em] hidden sm:inline-block"
            style={{ color: 'var(--muted)' }}
          >
            Verified match
          </span>

          <div className="ml-2 flex items-center">
            <UserProfileButton />
          </div>
        </nav>
      </div>
    </header>
  )
}

