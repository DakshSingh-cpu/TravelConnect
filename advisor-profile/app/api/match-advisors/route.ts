import { NextResponse } from 'next/server'
import path from 'path'
import { advisorBriefSchema } from '@/lib/advisorBrief'
import {
  defaultIntakePayload,
  parseIntakeBody,
  type MatchIntakePayload,
} from '@/lib/matchAdvisors'
import { matchAgencies } from '@/lib/matchAgenciesStage1'
import { rerankWithLlm } from '@/lib/rerankAdvisors'
import {
  enrichScoredResults,
  type EnrichedMatchedAdvisorV2,
} from '@/lib/enrichResults'

export type { EnrichedMatchedAdvisorV2 }

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
    })
  } catch (err) {
    console.error('[match-advisors] Stage 1 match error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
