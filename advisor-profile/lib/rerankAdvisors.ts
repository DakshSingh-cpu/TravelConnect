import { generateObject } from 'ai'
import { z } from 'zod'
import { getConciergeModel, hasGeminiApiKey } from '@/lib/aiModel'
import { validateRerankResult } from '@/lib/rerankValidation'
import type { ScoredAgency } from '@/lib/matchAgenciesStage1'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'

export type RerankMode = 'primary' | 'local'

interface RerankInput {
  allResults: ScoredAgency[]
  intake: MatchIntakePayload
  briefTldr: string
  mode: RerankMode
  pickCount?: number
}

interface RerankOutput {
  finalResults: ScoredAgency[]
  pitchMap: Map<number, string> | null
  rerankSource: 'llm' | 'fallback'
}

function buildCandidateSummaries(results: ScoredAgency[], mode: RerankMode) {
  return results.map((r) => {
    const base: Record<string, unknown> = {
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
    }
    if (mode === 'local') {
      base.agency_city = r.profile.city
      base.agency_country = r.profile.country
    }
    return base
  })
}

function buildPrompt(
  intake: MatchIntakePayload,
  candidateSummaries: Record<string, unknown>[],
  briefTldr: string,
  mode: RerankMode,
  pickCount: number,
): string {
  const travelerBlock = `## Traveler Profile
- Destination: ${intake.destination}
- Budget: ₹${intake.budgetLakh} lakh
- Travel style: ${intake.travelStyle}
- Vibe: ${intake.vibe} · Pace: ${intake.pace}
- Timing: ${intake.timing} · Duration: ${intake.duration}
${briefTldr ? `\n## Concierge Conversation Summary\n${briefTldr}` : ''}`

  const candidateBlock = `## Pre-screened Candidates (ranked by deterministic scoring)
${JSON.stringify(candidateSummaries, null, 2)}`

  if (mode === 'local') {
    return `You are a travel advisor matchmaker specializing in local, nearby advisors. Given a traveler's profile and ${candidateSummaries.length} pre-screened local agencies, pick the best ${pickCount} and write a 1-sentence personalized pitch for each.

${travelerBlock}

${candidateBlock}

## Instructions
1. Select exactly ${pickCount} agencies that best match this specific traveler. Prioritize geographic proximity and shared language, while still considering budget/style fit.
2. Order them best-match first.
3. Write a 1-sentence pitch (max 280 chars) for each. Emphasize proximity and local expertise. Do NOT invent facts not in the stats provided.
4. Use ONLY agency_id values from the candidates above.`
  }

  return `You are a travel advisor matchmaker. Given a traveler's profile and ${candidateSummaries.length} pre-screened agencies, pick the best ${pickCount} and write a 1-sentence personalized pitch for each.

${travelerBlock}

${candidateBlock}

## Instructions
1. Select exactly ${pickCount} agencies that best match this specific traveler.
2. Order them best-match first.
3. Write a 1-sentence pitch (max 280 chars) for each, grounded ONLY in the stats provided. Do NOT invent facts.
4. Use ONLY agency_id values from the candidates above.`
}

export async function rerankWithLlm(input: RerankInput): Promise<RerankOutput> {
  const { allResults, intake, briefTldr, mode } = input
  const pickCount = input.pickCount ?? 3
  let finalResults = allResults.slice(0, pickCount)
  let pitchMap: Map<number, string> | null = null
  let rerankSource: 'llm' | 'fallback' = 'fallback' as const

  if (allResults.length <= pickCount || !hasGeminiApiKey()) {
    return { finalResults, pitchMap, rerankSource }
  }

  try {
    const candidateSummaries = buildCandidateSummaries(allResults, mode)

    const rerankSchema = z.object({
      ranked_ids: z.array(z.number().int().positive()).length(pickCount),
      pitches: z
        .array(
          z.object({
            agency_id: z.number().int().positive(),
            pitch: z.string().max(280),
          }),
        )
        .length(pickCount),
    })

    const { object: rerankResult } = await generateObject({
      model: getConciergeModel(),
      schema: rerankSchema,
      schemaName: 'AdvisorReranking',
      schemaDescription: `Select the best ${pickCount} travel advisors and write a personalized pitch for each`,
      prompt: buildPrompt(intake, candidateSummaries, briefTldr, mode, pickCount),
      abortSignal: AbortSignal.timeout(8000),
    })

    const allowlistIds = allResults.map((r) => r.profile.agencyId)
    const validation = validateRerankResult(rerankResult, allowlistIds, pickCount)

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
      console.warn(`[rerank-${mode}] Validation failed:`, validation.reason)
    }
  } catch (err) {
    console.error(`[rerank-${mode}] LLM rerank failed, using fallback:`, err)
  }

  return { finalResults, pitchMap, rerankSource }
}
