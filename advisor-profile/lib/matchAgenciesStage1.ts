import Database from 'better-sqlite3'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import { resolveCityCoords } from '@/lib/cityGeocodes'
import {
  haversineKm,
  computeProximityScore,
  computeLanguageScore,
} from '@/lib/geoLanguage'

// ── Types ───────────────────────────────────────────────────────────────────

export interface MatchReason {
  code: 'destination' | 'budget' | 'quality' | 'proximity' | 'language'
  label: string
}

export interface LocalMatchContext {
  userLat: number
  userLng: number
  userCountryCode: string
  userLanguage: string
  excludeAgencyIds?: number[]
}

export interface ScoredAgency {
  profile: AgentProfile
  totalScore: number
  tier: 'A' | 'B' | 'C'
  matchReasons: MatchReason[]
}

export interface MatchIntakeInput {
  destination: string
  budgetLakh: number
  travelStyle: string
}

// ── Constants ───────────────────────────────────────────────────────────────

const INR_USD_RATE = 83
const ESTIMATED_TRIP_NIGHTS = 8

const REGION_COUNTRIES: Record<string, string[]> = {
  'europe': ['france', 'italy', 'spain', 'germany', 'uk', 'netherlands', 'belgium', 'switzerland', 'austria', 'czech republic', 'hungary', 'poland', 'denmark', 'sweden', 'finland', 'portugal', 'greece', 'ireland', 'russia'],
  'western europe': ['france', 'italy', 'spain', 'germany', 'uk', 'netherlands', 'belgium', 'switzerland', 'austria', 'portugal', 'ireland'],
  'southeast asia': ['thailand', 'malaysia', 'indonesia', 'singapore', 'philippines', 'vietnam'],
  'east asia': ['japan', 'south korea', 'china', 'taiwan', 'hong kong'],
  'middle east': ['uae', 'qatar', 'oman', 'turkey', 'egypt'],
  'south asia': ['india', 'sri lanka', 'nepal', 'bangladesh', 'maldives'],
  'north america': ['usa', 'canada'],
  'south america': ['brazil'],
  'africa': ['kenya', 'south africa', 'egypt'],
  'oceania': ['australia'],
  'scandinavia': ['denmark', 'sweden', 'finland'],
  'mediterranean': ['italy', 'spain', 'greece', 'turkey'],
  'alps': ['switzerland', 'austria', 'france', 'italy', 'germany'],
}

const COUNTRY_ALIASES: Record<string, string> = {
  'united states': 'usa',
  'united kingdom': 'uk',
  'great britain': 'uk',
  'england': 'uk',
  'scotland': 'uk',
  'wales': 'uk',
  'united arab emirates': 'uae',
  'emirates': 'uae',
  'indonesia': 'indonesia',
  'bali': 'indonesia',
  'maldives': 'maldives',
  'philippines': 'philippines',
  'holland': 'netherlands',
  'czech': 'czech republic',
  'czechia': 'czech republic',
  'korea': 'south korea',
}

// ── Database singleton ──────────────────────────────────────────────────────

let _db: Database.Database | null = null

export function getMatchDb(dbPath: string): Database.Database {
  if (!_db) {
    _db = new Database(dbPath, { readonly: true, fileMustExist: true })
    _db.pragma('journal_mode = WAL')
  }
  return _db
}

// ── Destination Normalization & Retrieval ───────────────────────────────────

interface CityRow {
  agency_id: number
  city: string
  country: string
  booking_count: number
}

interface CountryRow {
  agency_id: number
  country: string
  booking_count: number
}

function normalizeDestination(input: string): { cities: string[]; countries: string[]; regionCountries: string[] } {
  const lower = input.toLowerCase().trim()
  const cities: string[] = []
  const countries: string[] = []
  let regionCountries: string[] = []

  if (REGION_COUNTRIES[lower]) {
    regionCountries = REGION_COUNTRIES[lower]
    return { cities, countries, regionCountries }
  }

  const aliased = COUNTRY_ALIASES[lower] ?? lower
  countries.push(aliased)
  cities.push(aliased)

  return { cities, countries, regionCountries }
}

function retrieveCandidates(db: Database.Database, input: string): { agencyIds: Set<number>; tierMap: Map<number, 'A' | 'B' | 'C'>; targetBookings: Map<number, number> } {
  const { cities, countries, regionCountries } = normalizeDestination(input)
  const tierMap = new Map<number, 'A' | 'B' | 'C'>()
  const targetBookings = new Map<number, number>()

  const stmtCityExact = db.prepare('SELECT agency_id, city, country, booking_count FROM agency_cities WHERE city = ?')
  const stmtCityLike = db.prepare("SELECT agency_id, city, country, booking_count FROM agency_cities WHERE city LIKE ?")
  const stmtCountry = db.prepare('SELECT agency_id, country, booking_count FROM agency_countries WHERE country = ?')

  const addCityHits = (rows: CityRow[]) => {
    for (const r of rows) {
      if (!tierMap.has(r.agency_id)) tierMap.set(r.agency_id, 'A')
      targetBookings.set(r.agency_id, (targetBookings.get(r.agency_id) ?? 0) + r.booking_count)
    }
  }

  const addCountryHits = (rows: CountryRow[]) => {
    for (const r of rows) {
      if (!tierMap.has(r.agency_id)) {
        tierMap.set(r.agency_id, 'B')
        targetBookings.set(r.agency_id, (targetBookings.get(r.agency_id) ?? 0) + r.booking_count)
      }
    }
  }

  for (const city of cities) {
    const exact = stmtCityExact.all(city) as CityRow[]
    if (exact.length > 0) {
      addCityHits(exact)
    } else {
      const like = stmtCityLike.all(`%${city}%`) as CityRow[]
      addCityHits(like)
    }
  }

  for (const country of countries) {
    const rows = stmtCountry.all(country) as CountryRow[]
    addCountryHits(rows)
  }

  if (regionCountries.length > 0) {
    for (const country of regionCountries) {
      const rows = stmtCountry.all(country) as CountryRow[]
      addCountryHits(rows)
    }
  }

  if (tierMap.size === 0) {
    const allAgencies = db.prepare('SELECT id FROM agencies ORDER BY RANDOM() LIMIT 30').all() as { id: number }[]
    for (const a of allAgencies) {
      tierMap.set(a.id, 'C')
      targetBookings.set(a.id, 0)
    }
  }

  return { agencyIds: new Set(tierMap.keys()), tierMap, targetBookings }
}

// ── Budget Fit ──────────────────────────────────────────────────────────────

function computeBudgetFit(budgetLakh: number, agencyAvgBooking: number): number {
  const budgetUsd = (budgetLakh * 100_000) / INR_USD_RATE
  const perNightBudget = budgetUsd / ESTIMATED_TRIP_NIGHTS

  if (agencyAvgBooking <= 0) return 0.5

  const ratio = perNightBudget / agencyAvgBooking
  if (ratio >= 0.7 && ratio <= 1.5) return 1.0
  if (ratio >= 0.4 && ratio < 0.7) return 0.7
  if (ratio > 1.5 && ratio <= 3.0) return 0.7
  if (ratio >= 0.2 && ratio < 0.4) return 0.4
  if (ratio > 3.0 && ratio <= 5.0) return 0.4
  return 0.2
}

// ── Style Fit ───────────────────────────────────────────────────────────────

function computeStyleFit(intakeStyle: string, profile: AgentProfile): number {
  const style = intakeStyle.toLowerCase().trim()
  const tag = profile.travelStyleTag.toLowerCase()

  if (style === 'family' && (tag.includes('family') || profile.avgBookingsPerActiveBooker >= 2.5)) return 1.0
  if (style === 'couples' && tag.includes('couples')) return 1.0
  if (style === 'solo' && tag.includes('solo')) return 1.0
  if (style === 'adventure' && profile.numDistinctCitiesBooked >= 10) return 1.0
  if (style === 'luxury' && profile.budgetTier === '$$$ Luxury') return 1.0

  return 0.5
}

// ── Quality Score ───────────────────────────────────────────────────────────

function computeQuality(profile: AgentProfile): number {
  const repeat = profile.repeatClientRate
  const fulfillment = profile.tripFulfillmentRate

  const hasRepeat = repeat > 0
  const hasFulfillment = fulfillment > 0

  if (!hasRepeat && !hasFulfillment) return 0.5

  const values: number[] = []
  if (hasFulfillment) values.push(fulfillment / 100)
  if (hasRepeat) values.push(Math.min(repeat, 100) / 100)

  return values.reduce((a, b) => a + b, 0) / values.length
}

// ── Main Scoring Pipeline ───────────────────────────────────────────────────

export function matchAgencies(dbPath: string, intake: MatchIntakeInput, options?: { limit?: number }): ScoredAgency[] {
  const db = getMatchDb(dbPath)
  const { agencyIds, tierMap, targetBookings } = retrieveCandidates(db, intake.destination)

  if (agencyIds.size === 0) return []

  const stmtAgency = db.prepare('SELECT data FROM agencies WHERE id = ?')
  const candidates: { profile: AgentProfile; tier: 'A' | 'B' | 'C'; targetCityBookings: number }[] = []

  for (const id of agencyIds) {
    const row = stmtAgency.get(id) as { data: string } | undefined
    if (!row) continue
    const profile: AgentProfile = JSON.parse(row.data)
    candidates.push({
      profile,
      tier: tierMap.get(id) ?? 'C',
      targetCityBookings: targetBookings.get(id) ?? 0,
    })
  }

  if (candidates.length === 0) return []

  const absVolumes = candidates.map((c) => Math.log(1 + c.targetCityBookings))
  const minVol = Math.min(...absVolumes)
  const maxVol = Math.max(...absVolumes)
  const volRange = maxVol - minVol || 1

  const scored: ScoredAgency[] = candidates.map((c, i) => {
    const normalizedAbsVolume = (absVolumes[i] - minVol) / volRange
    const totalBookings = c.profile.totalVerifiedTrips
    const relShare = c.targetCityBookings / Math.max(1, totalBookings)
    const destinationFit = (0.7 * normalizedAbsVolume) + (0.3 * Math.min(1, relShare))

    const budgetFit = computeBudgetFit(intake.budgetLakh, c.profile.avgBookingValue)
    const styleFit = computeStyleFit(intake.travelStyle, c.profile)
    const quality = computeQuality(c.profile)

    const totalScore = 0.45 * destinationFit + 0.20 * budgetFit + 0.15 * styleFit + 0.20 * quality

    return {
      profile: c.profile,
      totalScore,
      tier: c.tier,
      matchReasons: [],
    }
  })

  scored.sort((a, b) => b.totalScore - a.totalScore)
  const limit = options?.limit ?? 3
  const top = scored.slice(0, limit)

  for (const s of top) {
    s.matchReasons = buildReasons(s, intake, targetBookings.get(s.profile.agencyId) ?? 0)
  }

  return top
}

// ── Reason Generation ───────────────────────────────────────────────────────

function buildReasons(scored: ScoredAgency, intake: MatchIntakeInput, targetBookings: number): MatchReason[] {
  const reasons: MatchReason[] = []
  const dest = intake.destination.trim()

  if (scored.tier === 'A' && targetBookings > 0) {
    reasons.push({ code: 'destination', label: `${targetBookings} verified hotel stays in ${dest}` })
  } else if (scored.tier === 'B') {
    reasons.push({ code: 'destination', label: `Specializes in ${dest}` })
  } else {
    reasons.push({ code: 'destination', label: `Experienced across multiple regions` })
  }

  const avg = scored.profile.avgBookingValue
  if (avg > 0) {
    reasons.push({ code: 'budget', label: `Typical booking ~$${Math.round(avg).toLocaleString()} fits your trip budget` })
  }

  const fulfillment = scored.profile.tripFulfillmentRate
  if (fulfillment > 0) {
    reasons.push({ code: 'quality', label: `${Math.round(fulfillment)}% trip fulfillment on platform` })
  } else if (scored.profile.repeatClientRate > 0) {
    reasons.push({ code: 'quality', label: `${Math.round(scored.profile.repeatClientRate)}% repeat client rate` })
  }

  return reasons
}

// ── Local / Proximity Matching Pipeline ─────────────────────────────────────

function retrieveAllAgencies(db: Database.Database, excludeIds: Set<number>): AgentProfile[] {
  const rows = db.prepare('SELECT id, data FROM agencies').all() as { id: number; data: string }[]
  const profiles: AgentProfile[] = []
  for (const row of rows) {
    if (excludeIds.has(row.id)) continue
    profiles.push(JSON.parse(row.data) as AgentProfile)
  }
  return profiles
}

interface LocalScoredCandidate {
  profile: AgentProfile
  proximityKm: number
  proximityScore: number
  languageScore: number
  budgetFit: number
  styleFit: number
  quality: number
  totalScore: number
}

export function matchAgenciesLocal(
  dbPath: string,
  intake: MatchIntakeInput,
  local: LocalMatchContext,
  options?: { limit?: number },
): ScoredAgency[] {
  const db = getMatchDb(dbPath)
  const excludeSet = new Set(local.excludeAgencyIds ?? [])
  const allProfiles = retrieveAllAgencies(db, excludeSet)

  if (allProfiles.length === 0) return []

  const candidates: LocalScoredCandidate[] = []
  for (const profile of allProfiles) {
    const cityCoords = resolveCityCoords(profile.city)
    let proximityKm = Infinity
    let proxScore = 0

    if (cityCoords) {
      proximityKm = haversineKm(local.userLat, local.userLng, cityCoords[0], cityCoords[1])
      proxScore = computeProximityScore(proximityKm)
    }

    const langScore = computeLanguageScore(local.userLanguage, profile.country)

    const cheapScore = 0.6 * langScore + 0.4 * proxScore
    if (cheapScore < 0.15) continue

    const budgetFit = computeBudgetFit(intake.budgetLakh, profile.avgBookingValue)
    const styleFit = computeStyleFit(intake.travelStyle, profile)
    const quality = computeQuality(profile)

    const totalScore =
      0.30 * proxScore +
      0.25 * langScore +
      0.20 * budgetFit +
      0.10 * styleFit +
      0.15 * quality

    candidates.push({
      profile,
      proximityKm,
      proximityScore: proxScore,
      languageScore: langScore,
      budgetFit,
      styleFit,
      quality,
      totalScore,
    })
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore)

  const limit = options?.limit ?? 10
  const top = candidates.slice(0, limit)

  return top.map((c) => ({
    profile: c.profile,
    totalScore: c.totalScore,
    tier: 'C' as const,
    matchReasons: buildLocalReasons(c, local),
  }))
}

function buildLocalReasons(c: LocalScoredCandidate, local: LocalMatchContext): MatchReason[] {
  const reasons: MatchReason[] = []

  if (c.proximityKm < Infinity) {
    const distLabel = c.proximityKm < 100
      ? `${Math.round(c.proximityKm)} km from you`
      : `~${Math.round(c.proximityKm / 10) * 10} km from you`
    reasons.push({ code: 'proximity', label: `Based in ${c.profile.city} · ${distLabel}` })
  }

  if (c.languageScore >= 0.6) {
    reasons.push({ code: 'language', label: `Operates in a ${local.userLanguage}-friendly market` })
  }

  const avg = c.profile.avgBookingValue
  if (avg > 0) {
    reasons.push({ code: 'budget', label: `Typical booking ~$${Math.round(avg).toLocaleString()} fits your trip budget` })
  }

  const fulfillment = c.profile.tripFulfillmentRate
  if (fulfillment > 0) {
    reasons.push({ code: 'quality', label: `${Math.round(fulfillment)}% trip fulfillment on platform` })
  }

  return reasons
}
