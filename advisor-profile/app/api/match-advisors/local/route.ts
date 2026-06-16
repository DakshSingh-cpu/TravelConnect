import { NextResponse } from 'next/server'
import path from 'path'
import { parseAdvisorBrief } from '@/lib/advisorBrief'
import {
  parseLocalMatchBody,
  type LocalMatchRequest,
} from '@/lib/matchAdvisors'
import { matchAgenciesLocal } from '@/lib/matchAgenciesStage1'
import { rerankWithLlm } from '@/lib/rerankAdvisors'
import { enrichScoredResults, type EnrichedMatchedAdvisorV2 } from '@/lib/enrichResults'
import {
  buildReadinessBlockedMatchResponse,
  deriveReadinessTier,
  normalizeAdvisorBrief,
} from '@/lib/guardrails/readiness'
import { DEFAULT_READINESS_SCORE } from '@/lib/guardrails/constants'
import { filterByAdvisorPreferences } from '@/lib/guardrails/advisorPreferenceFilter'

const DB_PATH = path.join(process.cwd(), 'data', 'match.db')

/**
 * POST /api/match-advisors/local
 *
 * Accepts the full intake payload plus geo fields (userLat, userLng, userCountryCode,
 * userCountryName, userLanguage) and an excludeAgencyIds list to avoid duplicating
 * the primary matches.
 *
 * Returns: { proximityAdvisors: EnrichedMatchedAdvisorV2[], rerankSource, meta }
 */
export async function POST(request: Request) {
  let localReq: LocalMatchRequest
  let advisorBrief = null

  try {
    const json = await request.json()
    const parsed = parseLocalMatchBody(json)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid local match payload — userLat, userLng, userCountryCode, and userLanguage are required' },
        { status: 400 },
      )
    }
    localReq = parsed

    if (json && typeof json === 'object' && 'advisorBrief' in json) {
      const raw = parseAdvisorBrief((json as { advisorBrief: unknown }).advisorBrief)
      if (raw) advisorBrief = normalizeAdvisorBrief(raw, localReq)
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const readinessScore = advisorBrief?.readiness_score ?? DEFAULT_READINESS_SCORE
  const readinessTier = deriveReadinessTier(readinessScore)

  if (readinessTier === 'blocked') {
    return NextResponse.json({
      ...buildReadinessBlockedMatchResponse(
        readinessScore,
        readinessTier,
        advisorBrief?.low_intent_signals ?? [],
      ),
      proximityAdvisors: [],
      rerankSource: 'fallback',
      meta: {
        detectedCountry: localReq.userCountryName,
        detectedLanguage: localReq.userLanguage,
        candidatesConsidered: 0,
      },
    })
  }

  let enriched: EnrichedMatchedAdvisorV2[] = []
  let rerankSource: 'llm' | 'fallback' = 'fallback'

  try {
    const allResults = matchAgenciesLocal(
      DB_PATH,
      {
        destination: localReq.destination,
        budgetLakh: localReq.budgetLakh,
        travelStyle: localReq.travelStyle,
      },
      {
        userLat: localReq.userLat,
        userLng: localReq.userLng,
        userCountryCode: localReq.userCountryCode,
        userLanguage: localReq.userLanguage,
        excludeAgencyIds: localReq.excludeAgencyIds,
      },
      { limit: 10 },
    )

    if (allResults.length === 0) {
      return NextResponse.json({
        proximityAdvisors: [],
        rerankSource: 'fallback',
        meta: { detectedCountry: localReq.userCountryName, detectedLanguage: localReq.userLanguage, candidatesConsidered: 0 },
      })
    }

    const reranked = await rerankWithLlm({
      allResults,
      intake: localReq,
      briefTldr: advisorBrief?.tldr ?? '',
      mode: 'local',
      pickCount: Math.min(3, allResults.length),
    })

    enriched = enrichScoredResults(reranked.finalResults, reranked.pitchMap, localReq)
    rerankSource = reranked.rerankSource
  } catch (err) {
    console.error('[match-advisors/local] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const filtered = await filterByAdvisorPreferences(
    enriched, readinessScore, readinessTier, localReq.budgetLakh ?? 0,
  )

  return NextResponse.json({
    proximityAdvisors: filtered,
    rerankSource,
    readinessTier,
    readinessScore,
    isNurtureLead: readinessTier === 'nurture',
    meta: {
      detectedCountry: localReq.userCountryName,
      detectedLanguage: localReq.userLanguage,
      candidatesConsidered: filtered.length,
    },
  })
}
