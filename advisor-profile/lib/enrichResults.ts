import { advisorIdForAgency, type MatchIntakePayload, type EnrichedMatchedAdvisor } from '@/lib/matchAdvisors'
import type { MatchReason, ScoredAgency } from '@/lib/matchAgenciesStage1'
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

export function enrichScoredResults(
  finalResults: ScoredAgency[],
  pitchMap: Map<number, string> | null,
  intake: MatchIntakePayload,
): EnrichedMatchedAdvisorV2[] {
  return finalResults.map((r, index) => {
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

    const destinations =
      profile.topDestinations.length > 0
        ? profile.topDestinations.join(', ')
        : 'your key destinations'
    const fulfillment =
      profile.tripFulfillmentRate > 0
        ? `${profile.tripFulfillmentRate.toFixed(0)}% trip fulfillment`
        : 'strong completion rates'

    const baseContext = `Ranked for ${fulfillment} — ${profile.agencyName} handles ${intake.travelStyle.toLowerCase()} trips across ${intake.destination}, within ₹${intake.budgetLakh}L budget. Expertise: ${destinations}.`
    const llmPitch = pitchMap?.get(profile.agencyId)

    return {
      id: advisorIdForAgency(profile.agencyId),
      name: profile.agencyName,
      title: `${profile.travelStyleTag} · ${profile.budgetTier}`,
      photoUrl: PERSONA_PHOTOS[index % PERSONA_PHOTOS.length],
      matchScore: Math.min(99, Math.max(75, Math.round(r.totalScore * 100))),
      llmContext: llmPitch ? `${llmPitch} ${baseContext}` : baseContext,
      csvAgencyId: profile.agencyId,
      agentProfile: profile,
      matchReasons: r.matchReasons,
    }
  })
}
