import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Attribution } from '@/lib/attribution'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import type { EnrichedMatchedAdvisor } from '@/lib/matchAdvisors'
import { notifyMatchedAdvisors } from '@/lib/push/notifyMatchedAdvisors'

// Use service-role key so anonymous clients can insert without a Supabase session
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type RequestBody = {
  advisors: EnrichedMatchedAdvisor[]
  intake: MatchIntakePayload
  attribution?: Attribution | null
}

/**
 * POST /api/match-sessions
 * Called client-side when a traveller completes the funnel and results are shown.
 * Persists intake + top-3 advisor IDs + ad attribution to match_sessions table.
 */
export async function POST(request: Request) {
  let body: RequestBody

  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { advisors, intake, attribution } = body

  if (!intake || !Array.isArray(advisors)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Extract the numeric CSV agency IDs from the matched advisors
  const advisorIds = advisors
    .map((a) => a.csvAgencyId)
    .filter((id): id is number => typeof id === 'number' && id > 0)

  const row = {
    destination: intake.destination ?? null,
    budget_lakh: intake.budgetLakh ?? null,
    travel_style: intake.travelStyle ?? null,
    vibe: intake.vibe ?? null,
    pace: intake.pace ?? null,
    timing: intake.timing ?? null,
    duration: intake.duration ?? null,
    advisor_ids: advisorIds.length > 0 ? advisorIds : null,
    // Attribution — null for organic traffic
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
    // Return 200 anyway — don't break the user's results page for a tracking failure
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
  }

  const matchSessionId = inserted.id

  // Notify matched advisors on mobile (non-blocking)
  void notifyMatchedAdvisors({
    matchSessionId,
    advisorAgencyIds: advisorIds,
    destination: row.destination,
  })

  return NextResponse.json({ ok: true, matchSessionId })
}
