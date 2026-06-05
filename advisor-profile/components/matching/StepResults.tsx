'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MatchIntakePayload, EnrichedMatchedAdvisor } from '@/lib/matchAdvisors'
import type { MatchReason } from '@/lib/matchAgenciesStage1'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import ChatEntryButton from '@/components/chat/ChatEntryButton'

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, x: 28, y: 8 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: 'spring' as const, damping: 26, stiffness: 280 },
  },
}

// ── Small SVG icons ─────────────────────────────────────────────────────────

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function reasonIcon(code: string) {
  if (code === 'destination') return <PinIcon />
  if (code === 'budget') return <DollarIcon />
  if (code === 'proximity') return <PinIcon />
  if (code === 'language') return <GlobeIcon />
  return <ShieldIcon />
}

/** Lightweight expertise tags — verified stats live on the full profile only. */
function AdvisorExpertisePanel({ profile }: { profile: AgentProfile }) {
  const cities =
    profile.bookingCities.length > 0
      ? profile.bookingCities.slice(0, 5).map((c) => c.city)
      : profile.topDestinations

  const hasTags =
    cities.length > 0 || profile.travelStyleTag || profile.budgetTier || profile.isFullServiceConcierge

  if (!hasTags) return null

  return (
    <div className="px-5 pb-1">
      {cities.length > 0 && (
        <div className="mb-3">
          <p
            className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ color: 'var(--section-label)' }}
          >
            <PinIcon />
            Expert in
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cities.map((city) => (
              <span
                key={city}
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--ink)',
                }}
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {profile.travelStyleTag && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)', background: 'var(--card-bg)' }}
          >
            {profile.travelStyleTag}
          </span>
        )}
        {profile.budgetTier && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)', background: 'var(--card-bg)' }}
          >
            {profile.budgetTier}
          </span>
        )}
        {profile.isFullServiceConcierge && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            style={{ borderColor: 'rgba(15,110,86,0.25)', color: 'var(--teal)', background: 'var(--teal-light)' }}
          >
            Full-Service
          </span>
        )}
      </div>
    </div>
  )
}

// ── Shared Advisor Card ────────────────────────────────────────────────────

type AdvisorCardProps = {
  advisor: EnrichedMatchedAdvisor & { matchReasons?: MatchReason[] }
}

function AdvisorMatchCard({ advisor }: AdvisorCardProps) {
  const router = useRouter()

  return (
    <article
      className="group isolate flex flex-col overflow-hidden rounded-2xl border shadow-[0_4px_24px_rgba(28,25,23,0.06)] backdrop-blur-md transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(15,110,86,0.12)]"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="relative border-b px-5 pt-6 pb-4" style={{ borderColor: 'var(--border)' }}>
        <Link
          href={`/advisor/${advisor.id}`}
          className="mx-auto block w-fit outline-offset-4 focus-visible:ring-2 focus-visible:ring-[#0F6E56]/40"
          aria-label={`View full profile for ${advisor.agentProfile?.agencyName || advisor.name}`}
        >
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white shadow-md ring-2 ring-[rgba(15,110,86,0.2)] transition-transform duration-300 group-hover:ring-[rgba(15,110,86,0.45)]">
            <Image
              src={advisor.photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        </Link>
        <div className="mt-4 text-center">
          <h2 className="font-display text-xl" style={{ color: 'var(--ink)' }}>
            {advisor.agentProfile?.agencyName || advisor.name}
          </h2>
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--muted)' }}>
            {advisor.title}
          </p>
          <p
            className="mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-bold tabular-nums"
            style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
          >
            {advisor.matchScore}% match
          </p>
        </div>
      </div>

      <div className="px-5 py-5">
        <div
          className="rounded-xl border px-4 py-3 text-left text-sm leading-relaxed shadow-sm"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--body)',
          }}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--section-label)' }}>
            Why you matched
          </p>
          {advisor.matchReasons && advisor.matchReasons.length > 0 ? (
            <ul className="space-y-1.5">
              {advisor.matchReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs leading-snug" style={{ color: 'var(--body)' }}>
                  <span className="mt-0.5 text-[var(--teal)]">{reasonIcon(reason.code)}</span>
                  <span>{reason.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{advisor.llmContext}</p>
          )}
          <p className="mt-2.5 text-[10px] leading-snug" style={{ color: 'var(--muted)' }}>
            Matched using verified TravelConnect booking patterns (90-day window).
          </p>
        </div>
      </div>

      {advisor.agentProfile && <AdvisorExpertisePanel profile={advisor.agentProfile} />}

      <div className="relative z-20 flex flex-col gap-2.5 px-5 pt-3 pb-5">
        <ChatEntryButton
          advisorRouteId={advisor.id}
          advisorDisplayName={advisor.agentProfile?.agencyName || advisor.name}
        />
        <button
          type="button"
          onClick={() => {
            router.push(`/advisor/${advisor.id}`)
          }}
          className="relative z-20 flex w-full cursor-pointer items-center justify-center rounded-xl border py-3 text-center text-sm font-semibold transition-colors hover:bg-[rgba(15,110,86,0.06)]"
          style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}
        >
          View full profile
        </button>
      </div>
    </article>
  )
}

// ── Country code → language helper for the browser ──────────────────────────

const COUNTRY_CODE_TO_LANGUAGE: Record<string, string> = {
  IN: 'hi', US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en',
  ZA: 'en', SG: 'en', PH: 'en', MY: 'ms', AE: 'ar', SA: 'ar', QA: 'ar',
  OM: 'ar', KW: 'ar', BH: 'ar', EG: 'ar', JO: 'ar', LB: 'ar', FR: 'fr',
  BE: 'fr', CH: 'de', DE: 'de', AT: 'de', NL: 'nl', IT: 'it', ES: 'es',
  PT: 'pt', BR: 'pt', MX: 'es', JP: 'ja', KR: 'ko', CN: 'zh', TW: 'zh',
  HK: 'zh', TH: 'th', VN: 'vi', ID: 'id', BD: 'bn', LK: 'si', NP: 'ne',
  PK: 'ur', TR: 'tr', RU: 'ru', PL: 'pl', CZ: 'cs', HU: 'hu', GR: 'el',
  SE: 'sv', DK: 'da', FI: 'fi', NO: 'no', KE: 'sw', NG: 'en', GH: 'en',
  MA: 'ar', TN: 'ar', DZ: 'ar', GE: 'ka', AZ: 'az', KZ: 'kk', UZ: 'uz',
  MV: 'dv',
}

function resolveUserLanguage(countryCode: string): string {
  if (typeof navigator !== 'undefined' && navigator.languages?.length > 0) {
    return navigator.languages[0].split('-')[0]
  }
  return COUNTRY_CODE_TO_LANGUAGE[countryCode.toUpperCase()] ?? 'en'
}

// ── BigDataCloud reverse geocode ────────────────────────────────────────────

interface GeoResult {
  countryCode: string
  countryName: string
  userLanguage: string
  lat: number
  lng: number
}

async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`)
  const data = await res.json() as { countryCode?: string; countryName?: string }
  const countryCode = data.countryCode ?? ''
  const countryName = data.countryName ?? ''
  return {
    countryCode,
    countryName,
    userLanguage: resolveUserLanguage(countryCode),
    lat,
    lng,
  }
}

function getUserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10_000,
      maximumAge: 60_000,
    })
  })
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  advisors: EnrichedMatchedAdvisor[]
  intake: MatchIntakePayload | null
  onBackToPreferences?: () => void
}

type LocalState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; advisors: (EnrichedMatchedAdvisor & { matchReasons?: MatchReason[] })[]; geoMeta: GeoResult }

export default function StepResults({ advisors, intake, onBackToPreferences }: Props) {
  const [localState, setLocalState] = useState<LocalState>({ status: 'idle' })

  const handleShowLocal = useCallback(async () => {
    if (!intake) return
    if (!('geolocation' in navigator)) {
      setLocalState({ status: 'error', message: 'Geolocation is not supported by your browser.' })
      return
    }

    setLocalState({ status: 'loading' })

    try {
      const position = await getUserPosition()
      const { latitude, longitude } = position.coords

      const geo = await reverseGeocode(latitude, longitude)

      const excludeAgencyIds = advisors
        .map((a) => a.csvAgencyId)
        .filter((id): id is number => id != null && id > 0)

      const res = await fetch('/api/match-advisors/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...intake,
          userLat: geo.lat,
          userLng: geo.lng,
          userCountryCode: geo.countryCode,
          userCountryName: geo.countryName,
          userLanguage: geo.userLanguage,
          excludeAgencyIds,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error || `Request failed (${res.status})`)
      }

      const data = await res.json() as { proximityAdvisors?: (EnrichedMatchedAdvisor & { matchReasons?: MatchReason[] })[] }
      const localAdvisors = data.proximityAdvisors ?? []

      if (localAdvisors.length === 0) {
        setLocalState({ status: 'error', message: 'No local advisors found in your area. Try adjusting your preferences.' })
        return
      }

      setLocalState({ status: 'done', advisors: localAdvisors, geoMeta: geo })
    } catch (err) {
      const geoErr = err as GeolocationPositionError | Error
      if ('code' in geoErr && geoErr.code === 1) {
        setLocalState({ status: 'error', message: 'Location permission denied. Please allow access to find local advisors.' })
      } else if ('code' in geoErr && geoErr.code === 3) {
        setLocalState({ status: 'error', message: 'Location request timed out. Please try again.' })
      } else {
        setLocalState({ status: 'error', message: (geoErr as Error).message || 'Something went wrong. Please try again.' })
      }
    }
  }, [intake, advisors])

  const summary =
    intake != null
      ? `${intake.destination} · ${intake.travelStyle} · ₹${intake.budgetLakh}L · ${intake.vibe} · ${intake.pace}`
      : 'Based on your trip preferences'

  return (
    <div className="flex w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Primary matches ───────────────────────────────────── */}
      <div className="mb-10 text-center">
        <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--section-label)' }}>
          Your top matches
        </p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl" style={{ color: 'var(--ink)' }}>
          Three advisors hand-picked for you
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
          {summary}. Each card explains why they fit — then chat or open a full profile when you are ready.
        </p>
      </div>

      <motion.ul
        className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 md:grid-cols-3"
        variants={listVariants}
        initial="hidden"
        animate="show"
        role="list"
      >
        {advisors.map((advisor) => (
          <motion.li key={advisor.id} variants={cardVariants} className="min-w-0 list-none">
            <AdvisorMatchCard advisor={advisor as EnrichedMatchedAdvisor & { matchReasons?: MatchReason[] }} />
          </motion.li>
        ))}
      </motion.ul>

      {/* ── Local advisors section ────────────────────────────── */}
      <div className="mt-12 flex flex-col items-center" role="region" aria-label="Local advisors">
        {localState.status === 'idle' && (
          <button
            type="button"
            onClick={handleShowLocal}
            className="group flex items-center gap-2.5 rounded-full border px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            style={{
              borderColor: 'var(--teal)',
              color: 'var(--teal)',
              background: 'var(--teal-light)',
            }}
          >
            <PinIcon />
            Show local advisors near you
          </button>
        )}

        {localState.status === 'loading' && (
          <div className="flex flex-col items-center gap-3" aria-live="polite">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--teal)', borderTopColor: 'transparent' }}
              role="status"
            />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Detecting your location &amp; finding nearby advisors…
            </p>
          </div>
        )}

        {localState.status === 'error' && (
          <div className="flex flex-col items-center gap-3" aria-live="assertive">
            <p className="max-w-md text-center text-sm" style={{ color: 'var(--muted)' }}>
              {localState.message}
            </p>
            <button
              type="button"
              onClick={() => setLocalState({ status: 'idle' })}
              className="text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-80"
              style={{ color: 'var(--teal)' }}
            >
              Try again
            </button>
          </div>
        )}

        <AnimatePresence>
          {localState.status === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full"
            >
              <div className="mb-8 text-center">
                <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--section-label)' }}>
                  Advisors near you
                </p>
                <h2 className="font-display text-2xl tracking-tight sm:text-3xl" style={{ color: 'var(--ink)' }}>
                  Local experts who speak your language
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm" style={{ color: 'var(--muted)' }}>
                  Based in {localState.geoMeta.countryName} · matched for {localState.geoMeta.userLanguage}
                </p>
              </div>

              <motion.ul
                className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 md:grid-cols-3"
                variants={listVariants}
                initial="hidden"
                animate="show"
                role="list"
              >
                {localState.advisors.map((advisor) => (
                  <motion.li key={advisor.id} variants={cardVariants} className="min-w-0 list-none">
                    <AdvisorMatchCard advisor={advisor} />
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {onBackToPreferences && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onBackToPreferences}
            className="text-sm underline-offset-4 transition-opacity hover:opacity-80"
            style={{ color: 'var(--muted)' }}
          >
            ← Adjust budget or travel style
          </button>
        </div>
      )}
    </div>
  )
}
