'use client'

import Link from 'next/link'

type Props = {
  advisorId: string
  displayName?: string
}

export default function AdvisorProfileStub({ advisorId, displayName }: Props) {
  const name = displayName ?? advisorId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(100% 80% at 80% 0%, var(--grad-1) 0%, transparent 45%), radial-gradient(90% 60% at 10% 20%, var(--grad-2) 0%, transparent 40%), var(--cream)',
      }}
    >
      <main className="mx-auto max-w-2xl px-4 py-16 md:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm transition-opacity hover:opacity-80"
          style={{ color: 'var(--muted)' }}
        >
          ← Back to matching
        </Link>

        <div
          className="rounded-2xl border p-10 shadow-lg backdrop-blur-md"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
          }}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--section-label)' }}>
            Coming soon
          </p>
          <h1 className="font-display text-3xl" style={{ color: 'var(--ink)' }}>
            {name}
          </h1>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
            Full profile pages for this advisor are not live yet. You reached{' '}
            <code className="rounded bg-stone-200/80 px-1.5 py-0.5 text-xs dark:bg-stone-700/80">/advisor/{advisorId}</code>
            . Explore Priya Rajan&apos;s complete verified profile in the meantime.
          </p>
          <Link
            href="/advisor/priya-rajan"
            className="mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
          >
            View Priya Rajan →
          </Link>
        </div>
      </main>
    </div>
  )
}
