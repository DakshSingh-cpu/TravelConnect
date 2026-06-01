'use client'

import { recentTrips } from '@/lib/data'
import { useState } from 'react'

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sm tracking-wide" style={{ color: '#BA7517' }} aria-label={`${count} stars`}>
      {'★'.repeat(count)}
    </span>
  )
}

export default function TripList() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <section
      className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl shadow-lg p-7"
      aria-labelledby="trips-title"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Recent Trips</p>
      <h2 className="font-display text-xl text-stone-900 mb-1">TBO Verified Itineraries</h2>
      <p className="text-sm text-stone-500 mb-6">
        Each itinerary below is a proven routing Priya has already delivered. She adapts dates, pacing, and hotels to you — no exact pricing shown until you speak.
      </p>

      <div className="flex flex-col gap-4">
        {recentTrips.map((trip, idx) => {
          const isOpen = expanded === trip.id
          return (
            <div
              key={trip.id}
              className="relative rounded-xl border bg-white/65 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-300"
              style={{ borderColor: 'rgba(28,25,23,0.08)' }}
            >
              {/* Timeline dot + line */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: 'linear-gradient(180deg, #0F6E56, transparent)' }} aria-hidden="true" />

              <div className="pl-5 pr-5 pt-5 pb-4">
                {/* Route */}
                <div className="font-display text-lg text-stone-900 mb-1">{trip.route}</div>

                {/* Meta */}
                <p className="text-sm text-stone-500 mb-3">
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
                <blockquote className="mt-2 text-sm text-stone-500 italic border-l-2 border-teal-200 pl-3 leading-relaxed">
                  "{trip.review}"
                  <footer className="mt-1 text-xs not-italic text-stone-400">— {trip.reviewer}</footer>
                </blockquote>

                {/* CTA Row */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">
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
                  <div className="mt-4 p-4 rounded-xl bg-teal-50/60 border border-teal-100 text-sm text-stone-600 space-y-2">
                    <p className="font-semibold text-teal-800">Priya will reach out to tailor this for you.</p>
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
