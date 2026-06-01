import { NextResponse } from 'next/server'
import path from 'path'
import { advisorBriefSchema } from '@/lib/advisorBrief'
import {
  advisorIdForAgency,
  defaultIntakePayload,
  parseIntakeBody,
  type MatchIntakePayload,
  type EnrichedMatchedAdvisor,
} from '@/lib/matchAdvisors'
import { matchAgencies, type MatchReason } from '@/lib/matchAgenciesStage1'
import { resolveCityCoords } from '@/lib/cityGeocodes'
import type { AgentMapPin } from '@/lib/agencyDataProcessor'

export type EnrichedMatchedAdvisorV2 = EnrichedMatchedAdvisor & {
  matchReasons: MatchReason[]
}

const PERSONA_PHOTOS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
]

const DB_PATH = path.join(process.cwd(), 'data', 'match.db')

/**
 * POST /api/match-advisors
 * Body: { destination, budgetLakh, travelStyle, vibe, pace, timing, duration, advisorBrief? }
 *
 * Returns: { advisors: EnrichedMatchedAdvisorV2[] }
 */
export async function POST(request: Request) {
  let intake: MatchIntakePayload
  let advisorBrief = null

  try {
    const json = await request.json()
    const parsed = parseIntakeBody(json)
    intake = parsed ?? defaultIntakePayload()
    if (json && typeof json === 'object' && 'advisorBrief' in json) {
      const briefParsed = advisorBriefSchema.safeParse(
        (json as { advisorBrief: unknown }).advisorBrief,
      )
      if (briefParsed.success) advisorBrief = briefParsed.data
    }
  } catch {
    intake = defaultIntakePayload()
  }

  let enriched: EnrichedMatchedAdvisorV2[] = []

  try {
    const results = matchAgencies(DB_PATH, {
      destination: intake.destination,
      budgetLakh: intake.budgetLakh,
      travelStyle: intake.travelStyle,
    })

    if (results.length > 0) {
      enriched = results.map((r, index) => {
        const profile = r.profile
        profile.mapPins = profile.bookingCities
          .map((c) => {
            const coords = resolveCityCoords(c.city)
            if (!coords) return null
            return {
              city: c.city,
              count: c.count,
              lat: coords[0],
              lng: coords[1],
            } as AgentMapPin
          })
          .filter((pin): pin is AgentMapPin => pin !== null)
        const destinations = profile.topDestinations.length > 0
          ? profile.topDestinations.join(', ')
          : 'your key destinations'
        const fulfillment = profile.tripFulfillmentRate > 0
          ? `${profile.tripFulfillmentRate.toFixed(0)}% trip fulfillment`
          : 'strong completion rates'

        return {
          id: advisorIdForAgency(profile.agencyId),
          name: profile.agencyName,
          title: `${profile.travelStyleTag} · ${profile.budgetTier}`,
          photoUrl: PERSONA_PHOTOS[index % PERSONA_PHOTOS.length],
          matchScore: Math.min(99, Math.max(75, Math.round(r.totalScore * 100))),
          llmContext: `Ranked for ${fulfillment} — ${profile.agencyName} handles ${intake.travelStyle.toLowerCase()} trips across ${intake.destination}, within ₹${intake.budgetLakh}L budget. Expertise: ${destinations}.`,
          csvAgencyId: profile.agencyId,
          agentProfile: profile,
          matchReasons: r.matchReasons,
        }
      })
    }
  } catch (err) {
    console.error('[match-advisors] Stage 1 match error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({
    advisors: enriched,
    intakeUsed: intake,
    briefUsed: Boolean(advisorBrief),
  })
}
