import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Attribution } from '@/lib/attribution'
import type { MatchIntakePayload, EnrichedMatchedAdvisor } from '@/lib/matchAdvisors'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { notifyMatchedAdvisors } from '@/lib/push/notifyMatchedAdvisors'
import { requireValidIntake } from '@/lib/guardrails/intakeGate'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { insertMatchSession } from '@/lib/matchSessions/insertSession'

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
  idempotencyKey?: string
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

  const { advisors, intake, attribution, advisorBrief: rawBrief, idempotencyKey } = body

  if (!intake || !Array.isArray(advisors)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const intakeResult = requireValidIntake(intake, '/api/match-sessions')
  if ('response' in intakeResult) {
    return intakeResult.response
  }
  const validatedIntake: MatchIntakePayload = intakeResult.intake

  const advisorIds = advisors
    .map((a) => a.csvAgencyId)
    .filter((id): id is number => typeof id === 'number' && id > 0)

  const created = await insertMatchSession(supabaseAdmin, {
    intake: validatedIntake,
    advisorIds,
    advisorBrief: rawBrief,
    attribution,
    idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : null,
  })

  if (!created) {
    return NextResponse.json({ ok: false, error: 'Could not save match session' }, { status: 200 })
  }

  if (created.readinessTier !== 'blocked' && advisorIds.length > 0) {
    void notifyMatchedAdvisors({
      matchSessionId: created.id,
      advisorAgencyIds: advisorIds,
      destination: validatedIntake.destination,
    })
  }

  return NextResponse.json({ ok: true, matchSessionId: created.id })
}
