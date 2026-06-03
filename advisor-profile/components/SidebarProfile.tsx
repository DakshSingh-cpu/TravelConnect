'use client'

import type { AgentProfile } from '@/lib/agencyDataProcessor'
import { formatExperienceOnPlatform } from '@/lib/agentProfileDisplay'
import type { MatchedAdvisor } from '@/lib/matchAdvisors'

function formatTrips(count: number): string {
  if (count >= 1000) return `${Math.floor(count / 100) * 100}+`
  if (count >= 100) return `${Math.floor(count / 10) * 10}+`
  return `${count}`
}

type Props = {
  persona: MatchedAdvisor
  agentProfile: AgentProfile | null
}

export default function SidebarProfile({ persona, agentProfile }: Props) {
  // If we have real CSV data, use it. Otherwise, fallback to the hardcoded persona values.
  const name = agentProfile?.agencyName || persona.name
  const title = persona.title
  const totalTrips = agentProfile ? formatTrips(agentProfile.totalVerifiedTrips) : '127'
  const yearsExp = agentProfile ? formatExperienceOnPlatform(agentProfile) : '14 Years'
  const confirmedStays = agentProfile
    ? agentProfile.numBookingsVouchHotelTotal > 0
      ? formatTrips(agentProfile.numBookingsVouchHotelTotal)
      : formatTrips(agentProfile.totalVerifiedTrips)
    : '127'
  const citiesCount =
    agentProfile?.numDistinctCitiesBooked ||
    agentProfile?.mapPins.length ||
    agentProfile?.topDestinations.length ||
    0
  const citiesServed = citiesCount > 0 ? String(citiesCount) : '—'
  const specialisations =
    agentProfile?.bookingCities.map((b) => b.city) ?? agentProfile?.topDestinations ?? []
  
  // Extract initials
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  const stats = [
    { value: totalTrips, label: 'TravelConnect-Verified Bookings' },
    { value: confirmedStays, label: 'Confirmed Stays' },
    { value: yearsExp, label: 'On Platform' },
    { value: citiesServed, label: 'Cities Served' },
  ]

  return (
    <aside className="flex flex-col gap-6 self-start md:sticky md:top-24">
      <div
        className="rounded-2xl p-6 shadow-lg backdrop-blur-xl"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="mb-5 flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-display text-2xl italic shadow-md"
            style={{
              background: 'linear-gradient(145deg, var(--teal-light), rgba(15,110,86,0.12))',
              color: 'var(--teal)',
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div>
            <h1 className="font-display text-xl leading-snug" style={{ color: 'var(--ink)' }}>
              {name}
            </h1>
            <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--subtle)' }}>
              {title}
            </p>
            <p className="text-xs leading-snug" style={{ color: 'var(--subtle)' }}>
              {agentProfile?.city}, {agentProfile?.country}
            </p>
          </div>
        </div>

        <div
          className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #0F6E56, #0a5a46)' }}
        >
          {persona.matchScore}% match
          <span className="text-xs font-normal opacity-90">— for your trip</span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center transition-transform duration-300 hover:-translate-y-0.5"
              style={{
                background: 'var(--stat-bg)',
                border: '1px solid var(--stat-border)',
              }}
            >
              <div className="mb-1 font-display text-xl leading-none" style={{ color: 'var(--teal)' }}>
                {s.value}
              </div>
              <div
                className="text-[10px] font-semibold uppercase leading-tight tracking-widest"
                style={{ color: 'var(--muted)' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #0F6E56, #0a5a46)' }}
        >
          Message {name.split(' ')[0]} →
        </button>
      </div>

      <div
        className="rounded-2xl p-5 shadow-lg backdrop-blur-xl"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
        }}
      >
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--section-label)' }}
        >
          Expertise & Specialisations
        </p>
        <div className="flex flex-wrap gap-2">
          {specialisations.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: 'var(--teal-light)',
                color: 'var(--teal)',
                border: '1px solid rgba(15,110,86,0.18)',
              }}
            >
              {tag}
            </span>
          ))}
          {agentProfile && (
            <>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--teal-light)',
                  color: 'var(--teal)',
                  border: '1px solid rgba(15,110,86,0.18)',
                }}
              >
                {agentProfile.travelStyleTag}
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--teal-light)',
                  color: 'var(--teal)',
                  border: '1px solid rgba(15,110,86,0.18)',
                }}
              >
                {agentProfile.budgetTier}
              </span>
            </>
          )}
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: 'rgba(254,243,205,0.95)',
              color: 'var(--gold)',
              border: '1px solid rgba(251,191,36,0.25)',
            }}
          >
            ★ TravelConnect Verified Partner
          </span>
        </div>
      </div>
    </aside>
  )
}
