import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Attribution } from '@/lib/attribution'
import type { MatchIntakePayload, EnrichedMatchedAdvisor } from '@/lib/matchAdvisors'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { parseAdvisorBrief } from '@/lib/advisorBrief'
import { notifyMatchedAdvisors } from '@/lib/push/notifyMatchedAdvisors'
import { requireValidIntake } from '@/lib/guardrails/intakeGate'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { deriveReadinessTier, normalizeAdvisorBrief } from '@/lib/guardrails/readiness'
import { DEFAULT_READINESS_SCORE, DEFAULT_READINESS_TIER } from '@/lib/guardrails/constants'

// Use service-role key so anonymous clients can insert without a Supabase session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type RequestBody = {
  advisors: EnrichedMatchedAdvisor[]
  intake: MatchIntakePayload
  attribution?: Attribution | null
  advisorBrief?: AdvisorBrief | unknown
}

/**
 * POST /api/match-sessions
 * Called client-side when a traveller completes the funnel and results are shown.
 * Persists intake + top-3 advisor IDs + ad attribution to match_sessions table.
 */
export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, 'match-sessions', '/api/match-sessions')
  if (rateLimited) return rateLimited

  let body: RequestBody

  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { advisors, intake, attribution, advisorBrief: rawBrief } = body

  if (!intake || !Array.isArray(advisors)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const intakeResult = requireValidIntake(intake, '/api/match-sessions')
  if ('response' in intakeResult) {
    return intakeResult.response
  }
  const validatedIntake: MatchIntakePayload = intakeResult.intake

  const parsedBrief = rawBrief ? parseAdvisorBrief(rawBrief) : null
  const normalizedBrief = parsedBrief
    ? normalizeAdvisorBrief(parsedBrief, validatedIntake)
    : null

  const readinessScore = normalizedBrief?.readiness_score ?? DEFAULT_READINESS_SCORE
  const readinessTier = normalizedBrief
    ? deriveReadinessTier(normalizedBrief.readiness_score)
    : DEFAULT_READINESS_TIER
  const lowIntentSignals = normalizedBrief?.low_intent_signals ?? []

  // Extract the numeric CSV agency IDs from the matched advisors
  const advisorIds = advisors
    .map((a) => a.csvAgencyId)
    .filter((id): id is number => typeof id === 'number' && id > 0)

  const row = {
    destination: validatedIntake.destination,
    budget_lakh: validatedIntake.budgetLakh,
    travel_style: validatedIntake.travelStyle,
    vibe: validatedIntake.vibe,
    pace: validatedIntake.pace,
    timing: validatedIntake.timing,
    duration: validatedIntake.duration,
    advisor_ids: advisorIds.length > 0 ? advisorIds : null,
    readiness_score: readinessScore,
    readiness_tier: readinessTier,
    low_intent_signals: lowIntentSignals,
    utm_source: attribution?.utm_source ?? null,
    utm_medium: attribution?.utm_medium ?? null,
    utm_campaign: attribution?.utm_campaign ?? null,
    utm_content: attribution?.utm_content ?? null,
    fbclid: attribution?.fbclid ?? null,
    landed_at: attribution?.landed_at ? new Date(attribution.landed_at) : null,
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('match_sessions')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.error('[match-sessions] Insert error:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
  }

  const matchSessionId = inserted.id

  if (readinessTier !== 'blocked' && advisorIds.length > 0) {
    void notifyMatchedAdvisors({
      matchSessionId,
      advisorAgencyIds: advisorIds,
      destination: row.destination,
    })
  }

  return NextResponse.json({ ok: true, matchSessionId })
}
