'use client'

import Link from 'next/link'

export default function TravellerChatLocked() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: 'var(--cream)' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
      >
        ✉
      </div>
      <h1 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
        Chat not ready yet
      </h1>
      <p className="max-w-sm text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
        We&apos;re finishing up your request review. You&apos;ll receive an email with a secure link
        to start chatting when everything is verified.
      </p>
      <Link
        href="/chat"
        className="rounded-lg px-5 py-2 text-sm font-medium"
        style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
      >
        Back to messages
      </Link>
    </div>
  )
}
