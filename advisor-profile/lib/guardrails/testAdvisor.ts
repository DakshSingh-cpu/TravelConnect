/**
 * DEV-ONLY: Force-include a test advisor (AEROTOUR MM, agency 110381) in every
 * match result set. Remove this when deploying to production.
 */
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import { advisorIdForAgency } from '@/lib/matchAdvisors'
import { resolveCityCoords } from '@/lib/cityGeocodes'
import type { AgentMapPin } from '@/lib/agencyDataProcessor'
import type { EnrichedMatchedAdvisorV2 } from '@/lib/enrichResults'

const TEST_AGENCY_ID = 110381

const PERSONA_PHOTOS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
]

function hydrateMapPins(profile: AgentProfile): AgentProfile {
  const mapPins = (profile.bookingCities ?? []).flatMap(({ city, count }) => {
    const coords = resolveCityCoords(city)
    if (!coords) return []
    return [{ city, count, lat: coords[0], lng: coords[1] } as AgentMapPin]
  })
  return { ...profile, mapPins }
}

function buildTestAdvisorEntry(
  profile: AgentProfile,
  intake: MatchIntakePayload,
  position: number,
): EnrichedMatchedAdvisorV2 {
  const destinations =
    profile.topDestinations.length > 0
      ? profile.topDestinations.join(', ')
      : 'key destinations'
  const fulfillment =
    profile.tripFulfillmentRate > 0
      ? `${profile.tripFulfillmentRate.toFixed(0)}% trip fulfillment`
      : 'strong completion rates'

  return {
    id: advisorIdForAgency(profile.agencyId),
    name: profile.agencyName,
    title: `${profile.travelStyleTag} · ${profile.budgetTier}`,
    photoUrl: PERSONA_PHOTOS[position % PERSONA_PHOTOS.length],
    matchScore: 95,
    llmContext: `[Test advisor] Ranked for ${fulfillment} — ${profile.agencyName} handles trips across ${intake.destination}, within ₹${intake.budgetLakh}L budget. Expertise: ${destinations}.`,
    csvAgencyId: profile.agencyId,
    agentProfile: hydrateMapPins(profile),
    matchReasons: [
      { code: 'destination', label: `Verified hotel stays in ${intake.destination}` },
      { code: 'quality', label: `${fulfillment} on platform` },
    ],
  }
}

/**
 * If AEROTOUR MM (110381) is not already in results, load it from the DB
 * and prepend it. Returns a new array — does not mutate the input.
 */
export function ensureTestAdvisorInResults(
  advisors: EnrichedMatchedAdvisorV2[],
  dbPath: string,
  intake: MatchIntakePayload,
): EnrichedMatchedAdvisorV2[] {
  const testRouteId = advisorIdForAgency(TEST_AGENCY_ID)
  if (advisors.some((a) => a.id === testRouteId)) return advisors

  try {
    const Database = require('better-sqlite3')
    const db = new Database(dbPath, { readonly: true, fileMustExist: true })
    const row = db.prepare('SELECT data FROM agencies WHERE id = ?').get(TEST_AGENCY_ID) as
      | { data: string }
      | undefined

    if (!row) {
      console.warn(`[test-advisor] Agency ${TEST_AGENCY_ID} not found in match.db`)
      return advisors
    }

    const profile = JSON.parse(row.data) as AgentProfile
    const entry = buildTestAdvisorEntry(profile, intake, 0)
    return [entry, ...advisors]
  } catch (err) {
    console.warn('[test-advisor] Failed to inject test advisor:', err)
    return advisors
  }
}
