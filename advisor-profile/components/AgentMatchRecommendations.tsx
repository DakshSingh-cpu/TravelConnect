'use client'

import { motion } from 'framer-motion'
import type { AgentProfile } from '@/lib/agencyDataProcessor'

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, damping: 28, stiffness: 260 },
  },
}

function PinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function StarIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function BriefcaseIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function AgentCard({ agent, rank }: { agent: AgentProfile; rank: number }) {
  const isTopPick = rank === 1
  const showLoyalty = agent.rebookingRateHotel > 10

  return (
    <motion.li variants={cardVariants} className="min-w-0 list-none">
      <article
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border backdrop-blur-md transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.015] hover:shadow-[0_16px_48px_rgba(15,110,86,0.14)]"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--border)',
          boxShadow: '0 4px 24px rgba(28,25,23,0.06)',
        }}
      >
        {isTopPick && (
          <div
            className="absolute top-0 right-0 z-10 rounded-bl-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white"
            style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
          >
            Best Match
          </div>
        )}

        {/* Header: Name + Location */}
        <div
          className="border-b px-6 pt-7 pb-5"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
              aria-hidden="true"
            >
              {agent.agencyName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2
                className="font-display truncate text-xl leading-tight"
                style={{ color: 'var(--ink)' }}
                title={agent.agencyName}
              >
                {agent.agencyName}
              </h2>
              <p
                className="mt-1 flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--muted)' }}
              >
                <PinIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {agent.city}, {agent.country}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Expertise tags — platform stats are on the full profile */}
        <div className="flex flex-1 flex-col gap-4 px-6 pt-5 pb-6">
          {/* Top Destinations */}
          {agent.topDestinations.length > 0 && (
            <div>
              <p
                className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: 'var(--section-label)' }}
              >
                <PinIcon className="h-3.5 w-3.5" />
                Expert In
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agent.topDestinations.map((city) => (
                  <span
                    key={city}
                    className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
                    style={{
                      background: 'var(--stat-bg)',
                      borderColor: 'var(--stat-border)',
                      color: 'var(--ink)',
                    }}
                  >
                    {city}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Travel Style + Budget + Concierge */}
          <div
            className="grid grid-cols-2 gap-2.5 rounded-xl border p-3"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--section-label)' }}
              >
                Style
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {agent.travelStyleTag}
              </p>
            </div>
            <div>
              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--section-label)' }}
              >
                Budget
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {agent.budgetTier}
              </p>
            </div>
            {agent.isFullServiceConcierge && (
              <div className="col-span-2 mt-1 flex items-center gap-1.5">
                <BriefcaseIcon className="h-3.5 w-3.5" style={{ color: 'var(--teal)' }} />
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--teal)' }}
                >
                  Full-Service Concierge
                </span>
              </div>
            )}
          </div>

          {/* Loyalty highlight */}
          {showLoyalty && (
            <div
              className="flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{
                background: 'rgba(186,117,23,0.06)',
                borderColor: 'rgba(186,117,23,0.15)',
              }}
            >
              <StarIcon
                className="h-4 w-4 shrink-0"
                style={{ color: 'var(--gold)' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--gold)' }}>
                High Customer Loyalty — {agent.rebookingRateHotel.toFixed(0)}% Repeat
                Booking Rate
              </span>
            </div>
          )}
        </div>
      </article>
    </motion.li>
  )
}

type Props = {
  agents: AgentProfile[]
}

export default function AgentMatchRecommendations({ agents }: Props) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p
          className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.12em]"
          style={{ color: 'var(--section-label)' }}
        >
          Platform-Verified Recommendations
        </p>
        <h1
          className="font-display text-3xl tracking-tight sm:text-4xl"
          style={{ color: 'var(--ink)' }}
        >
          Your top agent matches
        </h1>
        <p
          className="mx-auto mt-3 max-w-xl text-sm leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          Every metric below is verified from real platform data — not
          self-reported. Pick the agent whose expertise best fits your trip.
        </p>
      </div>

      <motion.ul
        className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3"
        variants={listVariants}
        initial="hidden"
        animate="show"
        role="list"
      >
        {agents.map((agent, i) => (
          <AgentCard key={agent.agencyId} agent={agent} rank={i + 1} />
        ))}
      </motion.ul>
    </section>
  )
}
