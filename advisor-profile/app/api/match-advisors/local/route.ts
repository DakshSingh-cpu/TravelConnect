import { NextResponse } from 'next/server'
import path from 'path'
import { advisorBriefSchema } from '@/lib/advisorBrief'
import {
  parseLocalMatchBody,
  type LocalMatchRequest,
} from '@/lib/matchAdvisors'
import { matchAgenciesLocal } from '@/lib/matchAgenciesStage1'
import { rerankWithLlm } from '@/lib/rerankAdvisors'
import { enrichScoredResults, type EnrichedMatchedAdvisorV2 } from '@/lib/enrichResults'

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
      const briefParsed = advisorBriefSchema.safeParse(
        (json as { advisorBrief: unknown }).advisorBrief,
      )
      if (briefParsed.success) advisorBrief = briefParsed.data
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
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

  return NextResponse.json({
    proximityAdvisors: enriched,
    rerankSource,
    meta: {
      detectedCountry: localReq.userCountryName,
      detectedLanguage: localReq.userLanguage,
      candidatesConsidered: enriched.length,
    },
  })
}
