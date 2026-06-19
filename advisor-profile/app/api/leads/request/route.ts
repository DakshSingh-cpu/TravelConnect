import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { isLeadVettingEnabled } from '@/lib/featureFlags'
import { notifyAdvisorOfPendingLead } from '@/lib/leads/notifyAdvisor'
import { runLeadVetting } from '@/lib/vetting/runLeadVetting'
import { parseAdvisorBrief } from '@/lib/advisorBrief'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import { insertMatchSession } from '@/lib/matchSessions/insertSession'
import type { SessionTelemetryPayload } from '@/lib/telemetry/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const zipSchema = z.string().regex(/^\d{6}$/)

type RequestBody = {
  advisorRouteId: string
  matchSessionId?: string | null
  intake?: MatchIntakePayload
  advisorIds?: number[]
  telemetry?: SessionTelemetryPayload
  residentialZip?: string
  advisorBrief?: unknown
}

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, 'leads-request', '/api/leads/request')
  if (rateLimited) return rateLimited

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required', code: 'NOT_AUTHENTICATED' },
      { status: 401 },
    )
  }

  if (!user.phone) {
    return NextResponse.json(
      { ok: false, error: 'Phone verification required', code: 'PHONE_NOT_VERIFIED' },
      { status: 403 },
    )
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { advisorRouteId, telemetry, residentialZip, advisorBrief: rawBrief } = body
  let { matchSessionId } = body

  if (!advisorRouteId || typeof advisorRouteId !== 'string') {
    return NextResponse.json({ ok: false, error: 'advisorRouteId is required' }, { status: 400 })
  }

  if (!matchSessionId && body.intake) {
    const advisorIds = Array.isArray(body.advisorIds)
      ? body.advisorIds.filter((id): id is number => typeof id === 'number' && id > 0)
      : []
    const created = await insertMatchSession(supabaseAdmin, {
      intake: body.intake,
      advisorIds,
      advisorBrief: rawBrief,
    })
    matchSessionId = created?.id ?? null
  }

  if (!matchSessionId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Match session not found. Please complete matching again.',
        code: 'MATCH_SESSION_REQUIRED',
      },
      { status: 400 },
    )
  }

  if (residentialZip) {
    const zipCheck = zipSchema.safeParse(residentialZip.trim())
    if (!zipCheck.success) {
      return NextResponse.json({ ok: false, error: 'Invalid residential zip code' }, { status: 400 })
    }
  }

  const { data: link } = await supabaseAdmin
    .from('advisor_user_links')
    .select('user_id')
    .eq('advisor_route_id', advisorRouteId)
    .maybeSingle()

  if (!link?.user_id) {
    return NextResponse.json(
      {
        ok: false,
        error: 'This advisor has not set up their messaging inbox yet.',
        code: 'ADVISOR_NOT_LINKED',
      },
      { status: 404 },
    )
  }

  if (matchSessionId && residentialZip) {
    await supabaseAdmin
      .from('match_sessions')
      .update({ residential_zip: residentialZip.trim() })
      .eq('id', matchSessionId)
  }

  if (matchSessionId && telemetry) {
    await supabaseAdmin.from('session_telemetry').insert({
      match_session_id: matchSessionId,
      traveller_user_id: user.id,
      payload: telemetry,
    })
  }

  const existing = await findExistingAssignment(user.id, advisorRouteId, matchSessionId)
  if (existing) return existing

  if (isLeadVettingEnabled()) {
    return handleVettingRequest(request, user, link.user_id, advisorRouteId, matchSessionId, rawBrief)
  }

  return handleLegacyRequest(user, link.user_id, advisorRouteId, matchSessionId)
}

async function findExistingAssignment(
  userId: string,
  advisorRouteId: string,
  matchSessionId?: string | null,
) {
  if (!matchSessionId) return null

  const { data: row } = await supabaseAdmin
    .from('lead_assignments')
    .select('id, status, conversation_id, chat_unlocked_at, expires_at')
    .eq('match_session_id', matchSessionId)
    .eq('advisor_route_id', advisorRouteId)
    .eq('traveller_user_id', userId)
    .maybeSingle()

  if (!row) return null

  if (isLeadVettingEnabled()) {
    if (row.status === 'approved' && row.conversation_id && row.chat_unlocked_at) {
      return NextResponse.json({
        ok: true,
        assignmentId: row.id,
        status: 'accepted' as const,
        conversationId: row.conversation_id,
      })
    }
    return NextResponse.json({ ok: true, assignmentId: row.id, status: 'vetting' as const })
  }

  if (row.status === 'accepted' || row.status === 'approved') {
    if (row.conversation_id) {
      return NextResponse.json({
        ok: true,
        assignmentId: row.id,
        status: 'accepted' as const,
        conversationId: row.conversation_id,
      })
    }
  }
  if (row.status === 'pending' || row.status === 'vetting') {
    return NextResponse.json({
      ok: true,
      assignmentId: row.id,
      status: 'pending' as const,
      expiresAt: row.expires_at,
    })
  }

  return null
}

async function handleVettingRequest(
  request: Request,
  user: { id: string; email?: string; phone?: string },
  advisorUserId: string,
  advisorRouteId: string,
  matchSessionId?: string | null,
  rawBrief?: unknown,
) {
  const rank = await computeRank(advisorRouteId, matchSessionId)

  if (matchSessionId) {
    await supabaseAdmin
      .from('match_sessions')
      .update({ lead_status: 'pending' })
      .eq('id', matchSessionId)
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('lead_assignments')
    .insert({
      match_session_id: matchSessionId ?? null,
      traveller_user_id: user.id,
      advisor_user_id: advisorUserId,
      advisor_route_id: advisorRouteId,
      rank,
      status: 'vetting',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('[leads/request] Insert error:', error?.message)
    return NextResponse.json({ ok: false, error: 'Could not create lead request' }, { status: 500 })
  }

  const brief = rawBrief ? parseAdvisorBrief(rawBrief) : null

  after(async () => {
    await runLeadVetting(supabaseAdmin, inserted.id, {
      email: user.email ?? '',
      phone: user.phone ?? '',
      userId: user.id,
      request,
      brief: brief ?? undefined,
    })
  })

  return NextResponse.json({
    ok: true,
    assignmentId: inserted.id,
    status: 'vetting' as const,
  })
}

async function handleLegacyRequest(
  user: { id: string },
  advisorUserId: string,
  advisorRouteId: string,
  matchSessionId?: string | null,
) {
  const rank = await computeRank(advisorRouteId, matchSessionId)
  let destination: string | null = null

  if (matchSessionId) {
    const { data: session } = await supabaseAdmin
      .from('match_sessions')
      .select('advisor_ids, destination')
      .eq('id', matchSessionId)
      .single()
    destination = session?.destination ?? null

    await supabaseAdmin
      .from('match_sessions')
      .update({ lead_status: 'pending' })
      .eq('id', matchSessionId)
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('lead_assignments')
    .insert({
      match_session_id: matchSessionId ?? null,
      traveller_user_id: user.id,
      advisor_user_id: advisorUserId,
      advisor_route_id: advisorRouteId,
      rank,
      status: 'pending',
    })
    .select('id, expires_at')
    .single()

  if (error || !inserted) {
    return NextResponse.json({ ok: false, error: 'Could not create lead request' }, { status: 500 })
  }

  void notifyAdvisorOfPendingLead(supabaseAdmin, advisorUserId, destination, inserted.id)

  return NextResponse.json({
    ok: true,
    assignmentId: inserted.id,
    status: 'pending' as const,
    expiresAt: inserted.expires_at,
  })
}

async function computeRank(advisorRouteId: string, matchSessionId?: string | null): Promise<number> {
  if (!matchSessionId) return 1
  const { data: session } = await supabaseAdmin
    .from('match_sessions')
    .select('advisor_ids')
    .eq('id', matchSessionId)
    .single()
  const ids: number[] = session?.advisor_ids ?? []
  const match = advisorRouteId.match(/^agency-(\d+)$/)
  if (!match) return 1
  const idx = ids.indexOf(Number(match[1]))
  return idx >= 0 ? idx + 1 : 1
}
