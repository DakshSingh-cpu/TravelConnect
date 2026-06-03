import { NextResponse } from 'next/server'
import path from 'path'
import { generateObject } from 'ai'
import { z } from 'zod'
import { advisorBriefSchema } from '@/lib/advisorBrief'
import {
  advisorIdForAgency,
  defaultIntakePayload,
  parseIntakeBody,
  type MatchIntakePayload,
  type EnrichedMatchedAdvisor,
} from '@/lib/matchAdvisors'
import {
  matchAgencies,
  type MatchReason,
  type ScoredAgency,
} from '@/lib/matchAgenciesStage1'
import { getConciergeModel, hasGeminiApiKey } from '@/lib/aiModel'
import { validateRerankResult } from '@/lib/rerankValidation'
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
 * Returns: { advisors: EnrichedMatchedAdvisorV2[], rerankSource: 'llm' | 'fallback' }
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
  let rerankSource: 'llm' | 'fallback' = 'fallback'

  try {
    const allResults = matchAgencies(
      DB_PATH,
      {
        destination: intake.destination,
        budgetLakh: intake.budgetLakh,
        travelStyle: intake.travelStyle,
      },
      { limit: 10 },
    )

    let finalResults = allResults.slice(0, 3)
    let pitchMap: Map<number, string> | null = null

    if (allResults.length > 3 && hasGeminiApiKey()) {
      try {
        const candidateSummaries = allResults.map((r) => ({
          agency_id: r.profile.agencyId,
          name: r.profile.agencyName,
          budget_tier: r.profile.budgetTier,
          travel_style: r.profile.travelStyleTag,
          fulfillment_rate: Math.round(r.profile.tripFulfillmentRate),
          repeat_rate: Math.round(r.profile.repeatClientRate),
          avg_booking_usd: Math.round(r.profile.avgBookingValue),
          top_destinations: r.profile.topDestinations.slice(0, 5),
          total_verified_trips: r.profile.totalVerifiedTrips,
          deterministic_score: Math.round(r.totalScore * 100),
        }))

        const briefTldr = advisorBrief?.tldr ?? ''

        const rerankSchema = z.object({
          ranked_ids: z.array(z.number().int().positive()).length(3),
          pitches: z
            .array(
              z.object({
                agency_id: z.number().int().positive(),
                pitch: z.string().max(280),
              }),
            )
            .length(3),
        })

        const { object: rerankResult } = await generateObject({
          model: getConciergeModel(),
          schema: rerankSchema,
          schemaName: 'AdvisorReranking',
          schemaDescription:
            'Select the best 3 travel advisors and write a personalized pitch for each',
          prompt: `You are a travel advisor matchmaker. Given a traveler's profile and ${allResults.length} pre-screened agencies, pick the best 3 and write a 1-sentence personalized pitch for each.

## Traveler Profile
- Destination: ${intake.destination}
- Budget: ₹${intake.budgetLakh} lakh
- Travel style: ${intake.travelStyle}
- Vibe: ${intake.vibe} · Pace: ${intake.pace}
- Timing: ${intake.timing} · Duration: ${intake.duration}
${briefTldr ? `\n## Concierge Conversation Summary\n${briefTldr}` : ''}

## Pre-screened Candidates (ranked by deterministic scoring)
${JSON.stringify(candidateSummaries, null, 2)}

## Instructions
1. Select exactly 3 agencies that best match this specific traveler.
2. Order them best-match first.
3. Write a 1-sentence pitch (max 280 chars) for each, grounded ONLY in the stats provided. Do NOT invent facts.
4. Use ONLY agency_id values from the candidates above.`,
          abortSignal: AbortSignal.timeout(8000),
        })

        const allowlistIds = allResults.map((r) => r.profile.agencyId)
        const validation = validateRerankResult(rerankResult, allowlistIds, 3)

        if (validation.valid) {
          const idToResult = new Map(
            allResults.map((r) => [r.profile.agencyId, r]),
          )
          finalResults = rerankResult.ranked_ids
            .map((id) => idToResult.get(id))
            .filter((r): r is ScoredAgency => r != null)
          pitchMap = new Map(
            rerankResult.pitches.map((p) => [p.agency_id, p.pitch]),
          )
          rerankSource = 'llm'
        } else {
          console.warn(
            '[match-advisors] Rerank validation failed:',
            validation.reason,
          )
        }
      } catch (err) {
        console.error(
          '[match-advisors] LLM rerank failed, using fallback:',
          err,
        )
      }
    }

    if (finalResults.length > 0) {
      enriched = finalResults.map((r, index) => {
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
          matchScore: Math.min(
            99,
            Math.max(75, Math.round(r.totalScore * 100)),
          ),
          llmContext: llmPitch ? `${llmPitch} ${baseContext}` : baseContext,
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
    rerankSource,
  })
}
