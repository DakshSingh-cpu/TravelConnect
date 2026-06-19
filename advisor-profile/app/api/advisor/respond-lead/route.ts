import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { cascadeToNextAdvisor } from '@/lib/leads/cascade'
import { notifyAdvisorOfPendingLead } from '@/lib/leads/notifyAdvisor'
import { sendTravelerAcceptedEmail } from '@/lib/email/resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type RequestBody = {
  assignmentId: string
  action: 'accept' | 'reject'
}

/**
 * POST /api/advisor/respond-lead
 *
 * Advisor accepts or rejects a pending lead assignment.
 * On accept: creates conversation, sends traveller email, links match session.
 * On reject: marks rejected, cascades to next ranked advisor.
 */
export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, 'leads-respond', '/api/advisor/respond-lead')
  if (rateLimited) return rateLimited

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('account_role')
    .eq('id', user.id)
    .single()

  if (profile?.account_role !== 'advisor') {
    return NextResponse.json({ ok: false, error: 'Advisor account required' }, { status: 403 })
  }

  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { assignmentId, action } = body

  if (!assignmentId || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'assignmentId and action (accept|reject) are required' }, { status: 400 })
  }

  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single()

  if (!assignment) {
    return NextResponse.json({ ok: false, error: 'Assignment not found' }, { status: 404 })
  }

  if (assignment.advisor_user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Not your assignment' }, { status: 403 })
  }

  if (assignment.status !== 'pending') {
    return NextResponse.json({
      ok: true,
      action: 'already_handled' as const,
      status: assignment.status,
    })
  }

  const now = new Date().toISOString()

  if (action === 'accept') {
    return handleAccept(assignment, user.id, now)
  }

  return handleReject(assignment, now)
}

async function handleAccept(
  assignment: {
    id: string
    match_session_id: string
    traveller_user_id: string
    advisor_user_id: string
    advisor_route_id: string
  },
  advisorUserId: string,
  now: string,
) {
  const { data: convId, error: rpcError } = await supabaseAdmin.rpc(
    'get_or_create_direct_conversation',
    { peer_user_id: assignment.traveller_user_id },
  )

  if (rpcError) {
    const convResult = await createConversationAdmin(
      supabaseAdmin,
      advisorUserId,
      assignment.traveller_user_id,
    )
    if (!convResult) {
      console.error('[respond-lead] Conversation creation failed')
      return NextResponse.json({ ok: false, error: 'Could not create conversation' }, { status: 500 })
    }
    return finishAccept(assignment, convResult, now)
  }

  return finishAccept(assignment, convId, now)
}

async function finishAccept(
  assignment: {
    id: string
    match_session_id: string
    traveller_user_id: string
    advisor_route_id: string
  },
  conversationId: string,
  now: string,
) {
  await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'accepted',
      conversation_id: conversationId,
      responded_at: now,
    })
    .eq('id', assignment.id)

  await supabaseAdmin
    .from('match_sessions')
    .update({ lead_status: 'accepted' })
    .eq('id', assignment.match_session_id)

  await supabaseAdmin
    .from('conversations')
    .update({
      match_session_id: assignment.match_session_id,
      lead_assignment_id: assignment.id,
    })
    .eq('id', conversationId)

  const { data: traveller } = await supabaseAdmin.auth.admin.getUserById(assignment.traveller_user_id)
  const { data: session } = await supabaseAdmin
    .from('match_sessions')
    .select('destination')
    .eq('id', assignment.match_session_id)
    .single()

  const { data: advisorLink } = await supabaseAdmin
    .from('advisor_user_links')
    .select('advisor_route_id')
    .eq('advisor_route_id', assignment.advisor_route_id)
    .maybeSingle()

  const advisorName = assignment.advisor_route_id.replace(/^agency-/, 'Advisor #')

  if (traveller?.user?.email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const chatUrl = `${siteUrl}/chat/${conversationId}`

    void sendTravelerAcceptedEmail({
      to: traveller.user.email,
      advisorName,
      destination: session?.destination ?? null,
      chatUrl,
    }).catch((err) => {
      console.error('[respond-lead] Email send failed:', err)
    })
  }

  return NextResponse.json({
    ok: true,
    action: 'accept' as const,
    conversationId,
  })
}

async function handleReject(
  assignment: {
    id: string
    match_session_id: string
    traveller_user_id: string
  },
  now: string,
) {
  await supabaseAdmin
    .from('lead_assignments')
    .update({ status: 'rejected', responded_at: now })
    .eq('id', assignment.id)

  const cascaded = await cascadeToNextAdvisor(
    supabaseAdmin,
    assignment.match_session_id,
    assignment.traveller_user_id,
  )

  if (cascaded) {
    const { data: session } = await supabaseAdmin
      .from('match_sessions')
      .select('destination')
      .eq('id', assignment.match_session_id)
      .single()

    const { data: nextLink } = await supabaseAdmin
      .from('advisor_user_links')
      .select('user_id')
      .eq('advisor_route_id', cascaded.advisorRouteId)
      .maybeSingle()

    if (nextLink?.user_id) {
      void notifyAdvisorOfPendingLead(
        supabaseAdmin,
        nextLink.user_id,
        session?.destination ?? null,
        cascaded.assignmentId,
      )
    }
  }

  return NextResponse.json({
    ok: true,
    action: 'reject' as const,
    cascadedTo: cascaded?.advisorRouteId ?? null,
  })
}

async function createConversationAdmin(
  admin: typeof supabaseAdmin,
  userId1: string,
  userId2: string,
): Promise<string | null> {
  const { data: conv, error } = await admin
    .from('conversations')
    .insert({})
    .select('id')
    .single()

  if (error || !conv) return null

  await admin.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: userId1 },
    { conversation_id: conv.id, user_id: userId2 },
  ])

  return conv.id
}
