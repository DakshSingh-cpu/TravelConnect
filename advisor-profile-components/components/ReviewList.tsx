'use client'

import { reviews } from '@/lib/data'

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sm tracking-wide" style={{ color: '#BA7517' }}>
      {'★'.repeat(count)}
    </span>
  )
}

export default function ReviewList() {
  return (
    <section
      className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl shadow-lg p-7"
      aria-labelledby="reviews-title"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Client Reviews</p>
      <h2 className="font-display text-xl text-stone-900 mb-5">In their own words</h2>

      <div className="flex flex-col gap-4">
        {reviews.map((rv) => (
          <article
            key={rv.id}
            className="rounded-xl bg-stone-50/70 border p-5 transition-transform duration-300 hover:-translate-y-0.5"
            style={{ borderColor: 'rgba(28,25,23,0.08)' }}
          >
            <div className="flex items-center justify-between mb-1 gap-3">
              <p className="font-semibold text-sm text-stone-900">{rv.name}</p>
              <Stars count={rv.stars} />
            </div>
            <p className="text-xs text-stone-400 mb-3">{rv.tripContext}</p>
            <p className="text-sm text-stone-700 leading-relaxed">"{rv.quote}"</p>
          </article>
        ))}
      </div>
    </section>
  )
}
