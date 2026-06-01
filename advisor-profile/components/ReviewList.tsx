'use client'

import { reviews } from '@/lib/data'

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sm tracking-wide" style={{ color: 'var(--gold)' }}>
      {'★'.repeat(count)}
    </span>
  )
}

export default function ReviewList() {
  return (
    <section
      className="rounded-2xl border p-7 shadow-lg backdrop-blur-xl"
      aria-labelledby="reviews-title"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card-bg)',
      }}
    >
      <p
        className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--section-label)' }}
      >
        Client Reviews
      </p>
      <h2 id="reviews-title" className="mb-5 font-display text-xl" style={{ color: 'var(--ink)' }}>
        In their own words
      </h2>

      <div className="flex flex-col gap-4">
        {reviews.map((rv) => (
          <article
            key={rv.id}
            className="rounded-xl border p-5 transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {rv.name}
              </p>
              <Stars count={rv.stars} />
            </div>
            <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
              {rv.tripContext}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
              &ldquo;{rv.quote}&rdquo;
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
