import type { AdvisorBrief } from '@/lib/advisorBrief'
import type { AgentProfile } from '@/lib/agencyDataProcessor'

/**
 * Types + mock matching logic for `/api/match-advisors`.
 * Replace `buildMockMatchedAdvisors` with an LLM call (OpenAI / Anthropic) later.
 */

export type { MatchIntakePayload } from '@/lib/intakeValidation'
import type { MatchIntakePayload } from '@/lib/intakeValidation'
import { parseAndValidateIntake } from '@/lib/intakeValidation'
import { INTAKE_FIELD_DEFAULTS } from '@/lib/guardrails/constants'

export type MatchedAdvisor = {
  id: string
  name: string
  title: string
  photoUrl: string
  matchScore: number
  llmContext: string
  /** Real Agency ID from the C360 CSV — used to enrich with verified platform data */
  csvAgencyId: number
}

/** Extended type returned by the API — includes verified C360 data */
export type EnrichedMatchedAdvisor = MatchedAdvisor & {
  agentProfile: AgentProfile | null
}

function clampScore(n: number): number {
  return Math.min(99, Math.max(82, Math.round(n)))
}

/**
 * Mock “LLM” output: deterministic, personalized copy from intake.
 * Swap this for `await openai.chat.completions.create(...)` and map JSON → MatchedAdvisor[].
 */
const PERSONA_PHOTOS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
]

export function advisorIdForAgency(agencyId: number): string {
  return `agency-${agencyId}`
}

export function parseAgencyIdFromAdvisorRoute(advisorId: string): number | null {
  const match = advisorId.match(/^agency-(\d+)$/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) && id > 0 ? id : null
}

/**
 * Temporary ranking: top CSV agencies by fulfillment (until real matchmaking ships).
 */
export function buildEnrichedAdvisorsFromProfiles(
  profiles: AgentProfile[],
  intake: MatchIntakePayload,
  brief?: AdvisorBrief | null,
): EnrichedMatchedAdvisor[] {
  const { destination, budgetLakh, travelStyle, vibe, pace, timing, duration } = intake
  const dest = destination.trim() || 'your destination'
  const budget = `₹${budgetLakh}L`
  const briefNote = brief?.tldr ? ` Concierge note: ${brief.tldr}` : ''

  return profiles.slice(0, 3).map((profile, index) => {
    const destinations =
      profile.topDestinations.length > 0
        ? profile.topDestinations.join(', ')
        : 'your key destinations'
    const fulfillment =
      profile.tripFulfillmentRate > 0
        ? `${profile.tripFulfillmentRate.toFixed(0)}% trip fulfillment`
        : 'strong completion rates on platform'

    return {
      id: advisorIdForAgency(profile.agencyId),
      name: profile.agencyName,
      title: `${profile.travelStyleTag} · ${profile.budgetTier}`,
      photoUrl: PERSONA_PHOTOS[index % PERSONA_PHOTOS.length],
      matchScore: clampScore(94 - index * 4 + (budgetLakh % 3)),
      llmContext: `Ranked for ${fulfillment} and low cancellations — ${profile.agencyName} books ${travelStyle.toLowerCase()} trips across ${dest} within ${budget}, with ${vibe.toLowerCase()} pacing for ${timing.toLowerCase()} (${duration.toLowerCase()}). Expertise: ${destinations}.${briefNote}`,
      csvAgencyId: profile.agencyId,
      agentProfile: profile,
    }
  })
}

export function buildMockMatchedAdvisors(
  intake: MatchIntakePayload,
  brief?: AdvisorBrief | null,
): MatchedAdvisor[] {
  const { destination, budgetLakh, travelStyle, vibe, pace, timing, duration } = intake
  const dest = destination.trim() || 'your destination'
  const budget = `₹${budgetLakh}L`
  const logisticsSummary = `${vibe.toLowerCase()} energy, ${pace.toLowerCase()} pacing, ${timing.toLowerCase()}, ${duration.toLowerCase()} stays`
  const briefNote = brief?.tldr ? ` Concierge note: ${brief.tldr}` : ''

  return [
    {
      id: 'priya-rajan',
      name: 'Priya Rajan',
      title: 'TravelConnect Gold Advisor · Europe Specialist',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
      matchScore: clampScore(94 + (budgetLakh % 3)),
      llmContext: `Matched for your ${vibe.toLowerCase()} trip with a ${pace.toLowerCase()} pace — Priya has repeatedly planned ${travelStyle.toLowerCase()} journeys across ${dest} within ${budget}, tuned for ${timing.toLowerCase()} and roughly ${duration.toLowerCase()} on the ground. Her rail-first style and hotel pacing align with ${logisticsSummary}.${briefNote}`,
      csvAgencyId: 92414, // Total Trip Planners — full demo metrics (repeat, cancel, b2v, avg booking)
    },
    {
      id: 'elena-vogt',
      name: 'Elena Vogt',
      title: 'Senior Advisor · Alps & Mediterranean',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
      matchScore: clampScore(89 + (budgetLakh % 4)),
      llmContext: `Elena shines when travelers want ${vibe.toLowerCase()} depth without burnout — she balances ${pace.toLowerCase()} days across ${dest} for ${travelStyle.toLowerCase()} groups. Your ${budget} budget and ${timing.toLowerCase()} horizon pair well with ${duration.toLowerCase()} itineraries she books every season.`,
      csvAgencyId: 31514, // Waranart Travel — full demo metrics, fast confirmation speed
    },
    {
      id: 'marcus-bell',
      name: 'Marcus Bell',
      title: 'Luxury Rail & Heritage Routes',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
      matchScore: clampScore(86 + (budgetLakh % 5)),
      llmContext: `Marcus front-loads logistics for ${travelStyle.toLowerCase()} travelers chasing a ${vibe.toLowerCase()} mood at ${pace.toLowerCase()} speed. He routinely stretches ${budget} across ${dest} for windows like yours (${timing.toLowerCase()}) and shapes days around ${duration.toLowerCase()} trip lengths.`,
      csvAgencyId: 42232, // Macroturismo Pereira — full demo metrics, premium avg booking
    },
  ]
}

export type LocalMatchRequest = MatchIntakePayload & {
  userLat: number
  userLng: number
  userCountryCode: string
  userCountryName: string
  userLanguage: string
  excludeAgencyIds: number[]
}

export function parseLocalMatchBody(body: unknown): LocalMatchRequest | null {
  const intake = parseIntakeBody(body)
  if (!intake) return null

  const o = body as Record<string, unknown>

  const userLat = Number(o.userLat)
  const userLng = Number(o.userLng)
  if (!Number.isFinite(userLat) || userLat < -90 || userLat > 90) return null
  if (!Number.isFinite(userLng) || userLng < -180 || userLng > 180) return null

  const userCountryCode = typeof o.userCountryCode === 'string' ? o.userCountryCode.trim() : ''
  const userCountryName = typeof o.userCountryName === 'string' ? o.userCountryName.trim() : ''
  const userLanguage = typeof o.userLanguage === 'string' ? o.userLanguage.trim() : ''
  if (!userCountryCode || userCountryCode.length > 3) return null
  if (!userLanguage || userLanguage.length > 10) return null

  let excludeAgencyIds: number[] = []
  if (Array.isArray(o.excludeAgencyIds)) {
    excludeAgencyIds = (o.excludeAgencyIds as unknown[])
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0)
  }

  return {
    ...intake,
    userLat,
    userLng,
    userCountryCode,
    userCountryName,
    userLanguage,
    excludeAgencyIds,
  }
}

export function defaultIntakePayload(): MatchIntakePayload {
  return {
    destination: 'Western Europe',
    budgetLakh: 15,
    travelStyle: 'Family',
    ...INTAKE_FIELD_DEFAULTS,
  }
}

/** Lenient parse for session restore — returns null when intake fails guardrails. */
export function parseIntakeBody(body: unknown): MatchIntakePayload | null {
  const result = parseAndValidateIntake(body)
  return result.success ? result.data : null
}
