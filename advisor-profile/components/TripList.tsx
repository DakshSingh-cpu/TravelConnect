'use client'

import { recentTrips } from '@/lib/data'
import { useState } from 'react'

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sm tracking-wide" style={{ color: 'var(--gold)' }} aria-label={`${count} stars`}>
      {'★'.repeat(count)}
    </span>
  )
}

export default function TripList() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <section
      className="rounded-2xl border p-7 shadow-lg backdrop-blur-xl"
      aria-labelledby="trips-title"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
        Recent Trips
      </p>
      <h2 id="trips-title" className="mb-1 font-display text-xl" style={{ color: 'var(--ink)' }}>
        TravelConnect Verified Itineraries
      </h2>
      <p className="mb-6 text-sm" style={{ color: 'var(--muted)' }}>
        Each itinerary below is a proven routing Priya has already delivered. She adapts dates, pacing, and hotels to you — no exact pricing shown until you speak.
      </p>

      <div className="flex flex-col gap-4">
        {recentTrips.map((trip, idx) => {
          const isOpen = expanded === trip.id
          return (
            <div
              key={trip.id}
              className="relative overflow-hidden rounded-xl border backdrop-blur-md shadow-sm transition-all duration-300"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              {/* Timeline dot + line */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'linear-gradient(180deg, #0F6E56, transparent)' }} aria-hidden="true" />

              <div className="pl-5 pr-5 pt-5 pb-4">
                {/* Route */}
                <div className="mb-1 font-display text-lg" style={{ color: 'var(--ink)' }}>
                  {trip.route}
                </div>

                {/* Meta */}
                <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>
                  {trip.duration} · {trip.groupType} · {trip.date}
                </p>

                {/* Vibe tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {trip.vibes.map((v) => (
                    <span
                      key={v}
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(225,245,238,0.9)', color: '#0F6E56', border: '1px solid rgba(15,110,86,0.12)' }}
                    >
                      {v}
                    </span>
                  ))}
                </div>

                <Stars count={trip.stars} />

                {/* Review */}
                <blockquote
                  className="mt-2 border-l-2 pl-3 text-sm italic leading-relaxed"
                  style={{ color: 'var(--body)', borderColor: 'var(--teal-light)' }}
                >
                  "{trip.review}"
                  <footer className="mt-1 text-xs not-italic" style={{ color: 'var(--muted)' }}>
                    — {trip.reviewer}
                  </footer>
                </blockquote>

                {/* CTA Row */}
                <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                    Clone-ready routing
                  </span>
                  <button
                    type="button"
                    className="text-sm font-bold text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg, #0F6E56, #0a5a46)' }}
                    onClick={() => setExpanded(isOpen ? null : trip.id)}
                  >
                    {isOpen ? 'Close ✕' : 'Use this itinerary →'}
                  </button>
                </div>

                {/* Expanded micro-form */}
                {isOpen && (
                  <div
                    className="mt-4 space-y-2 rounded-xl border p-4 text-sm"
                    style={{
                      background: 'var(--teal-light)',
                      borderColor: 'var(--border)',
                      color: 'var(--body)',
                    }}
                  >
                    <p className="font-semibold" style={{ color: 'var(--teal)' }}>
                      Priya will reach out to tailor this for you.
                    </p>
                    <p>Just send her a message and mention you're interested in the <strong>{trip.route}</strong> routing. She'll adapt dates, hotels, and budget to your needs.</p>
                    <button
                      type="button"
                      className="mt-2 w-full py-2.5 rounded-lg font-semibold text-sm text-white active:scale-[0.97] transition-transform"
                      style={{ background: '#0F6E56' }}
                    >
                      Message Priya about this trip →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
