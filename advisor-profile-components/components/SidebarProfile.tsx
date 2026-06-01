'use client'

import { advisor } from '@/lib/data'

const stats = [
  { value: advisor.totalBookings.toString(), label: 'TBO-Verified Bookings' },
  { value: `${advisor.rating}★`, label: 'Avg Star Rating' },
  { value: `${advisor.yearsExperience} yrs`, label: 'Experience' },
  { value: `${advisor.repeatClientRate}%`, label: 'Repeat Clients' },
]

export default function SidebarProfile() {
  return (
    <aside className="sticky top-8 flex flex-col gap-5">
      {/* Avatar + Identity */}
      <div className="rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-lg p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display italic flex-shrink-0 shadow-md"
            style={{ background: 'linear-gradient(145deg, #E1F5EE, rgba(15,110,86,0.15))', color: '#0F6E56' }}
            aria-hidden="true"
          >
            {advisor.initials}
          </div>
          <div>
            <h1 className="font-display text-xl leading-snug text-stone-900">{advisor.name}</h1>
            <p className="text-xs text-muted mt-0.5">{advisor.title}</p>
            <p className="text-xs text-muted">{advisor.location} · {advisor.languages.join(', ')}</p>
          </div>
        </div>

        {/* Match Pill */}
        <div
          className="inline-flex items-center gap-2 flex-wrap rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md mb-5"
          style={{ background: 'linear-gradient(135deg, #0F6E56, #0a5a46)' }}
        >
          {advisor.matchScore}% match
          <span className="text-xs font-normal opacity-90">— {advisor.matchContext}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-3 text-center transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div className="font-display text-xl leading-none mb-1 text-teal-brand">{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          className="w-full py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #0F6E56, #0a5a46)' }}
        >
          Message Priya →
        </button>
        <button
          type="button"
          className="mt-2 w-full py-3 rounded-xl font-semibold text-sm border border-teal-brand text-teal-brand bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-teal-50 active:scale-[0.97]"
        >
          What to ask her ↗
        </button>
      </div>

      {/* Specialisations */}
      <div className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl shadow p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Specialisations</p>
        <div className="flex flex-wrap gap-2">
          {advisor.specialisations.map((tag) => (
            <span
              key={tag}
              className="text-xs font-semibold px-3 py-1 rounded-full transition-transform duration-200 hover:-translate-y-0.5"
              style={{ background: 'rgba(225,245,238,0.85)', color: '#0F6E56', border: '1px solid rgba(15,110,86,0.12)' }}
            >
              {tag}
            </span>
          ))}
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'rgba(254,243,205,0.95)', color: '#BA7517', border: '1px solid rgba(186,117,23,0.2)' }}
          >
            ★ TBO Gold Advisor
          </span>
        </div>
      </div>
    </aside>
  )
}
