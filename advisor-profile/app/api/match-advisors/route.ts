import { NextResponse } from 'next/server'
import path from 'path'
import { parseAdvisorBrief } from '@/lib/advisorBrief'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import { matchAgencies } from '@/lib/matchAgenciesStage1'
import { rerankWithLlm } from '@/lib/rerankAdvisors'
import {
  enrichScoredResults,
  type EnrichedMatchedAdvisorV2,
} from '@/lib/enrichResults'
import { requireValidIntake } from '@/lib/guardrails/intakeGate'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import {
  buildReadinessBlockedMatchResponse,
  deriveReadinessTier,
  normalizeAdvisorBrief,
} from '@/lib/guardrails/readiness'
import { DEFAULT_READINESS_SCORE } from '@/lib/guardrails/constants'

export type { EnrichedMatchedAdvisorV2 }

const DB_PATH = path.join(process.cwd(), 'data', 'match.db')

/**
 * POST /api/match-advisors
 * Body: { destination, budgetLakh, travelStyle, vibe, pace, timing, duration, advisorBrief? }
 *
 * Returns: { advisors: EnrichedMatchedAdvisorV2[], rerankSource: 'llm' | 'fallback' }
 */
export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, 'match-advisors', '/api/match-advisors')
  if (rateLimited) return rateLimited

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const intakeResult = requireValidIntake(json, '/api/match-advisors')
  if ('response' in intakeResult) {
    return intakeResult.response
  }
  const intake: MatchIntakePayload = intakeResult.intake

  let advisorBrief = null
  if (json && typeof json === 'object' && 'advisorBrief' in json) {
    const raw = parseAdvisorBrief((json as { advisorBrief: unknown }).advisorBrief)
    if (raw) {
      advisorBrief = normalizeAdvisorBrief(raw, intake)
    }
  }

  const readinessScore = advisorBrief?.readiness_score ?? DEFAULT_READINESS_SCORE
  const readinessTier = deriveReadinessTier(readinessScore)

  if (readinessTier === 'blocked' || readinessTier === 'nurture') {
    console.info('[readiness-gate]', {
      route: '/api/match-advisors',
      tier: readinessTier,
      score: readinessScore,
    })
    return NextResponse.json(
      buildReadinessBlockedMatchResponse(
        readinessScore,
        readinessTier,
        advisorBrief?.low_intent_signals ?? [],
      ),
      { status: 200 },
    )
  }

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

    const { finalResults, pitchMap, rerankSource } = await rerankWithLlm({
      allResults,
      intake,
      briefTldr: advisorBrief?.tldr ?? '',
      mode: 'primary',
      pickCount: 3,
    })

    const enriched = enrichScoredResults(finalResults, pitchMap, intake)

    return NextResponse.json({
      advisors: enriched,
      intakeUsed: intake,
      briefUsed: Boolean(advisorBrief),
      rerankSource,
      readinessTier,
      readinessScore,
      isNurtureLead: false,
      lowIntentSignals: advisorBrief?.low_intent_signals ?? [],
    })
  } catch (err) {
    console.error('[match-advisors] Stage 1 match error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
