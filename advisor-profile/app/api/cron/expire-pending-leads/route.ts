import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cascadeToNextAdvisor } from '@/lib/leads/cascade'
import { notifyAdvisorOfPendingLead } from '@/lib/leads/notifyAdvisor'
import { sendLeadExpiredEmail } from '@/lib/email/resend'

/**
 * POST /api/cron/expire-pending-leads
 *
 * Scheduled via Vercel Cron (see vercel.json). Finds pending lead_assignments
 * past their expires_at, marks them expired, cascades to the next advisor,
 * and emails the traveller if all advisors have been exhausted.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[expire-pending-leads] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: expired, error: queryError } = await supabaseAdmin
    .from('lead_assignments')
    .select('id, match_session_id, traveller_user_id')
    .eq('status', 'pending')
    .lt('expires_at', now)

  if (queryError) {
    console.error('[expire-pending-leads] Query error:', queryError.message)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!expired?.length) {
    console.info('[expire-pending-leads] No expired assignments found')
    return NextResponse.json({ expired: 0, cascaded: 0, exhausted: 0 })
  }

  let expiredCount = 0
  let cascadedCount = 0
  let exhaustedCount = 0

  for (const assignment of expired) {
    const { error: updateError } = await supabaseAdmin
      .from('lead_assignments')
      .update({ status: 'expired', responded_at: now })
      .eq('id', assignment.id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('[expire-pending-leads] Update error for', assignment.id, updateError.message)
      continue
    }

    expiredCount++

    const cascaded = await cascadeToNextAdvisor(
      supabaseAdmin,
      assignment.match_session_id,
      assignment.traveller_user_id,
    )

    if (cascaded) {
      cascadedCount++

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
    } else {
      exhaustedCount++

      const { data: traveller } = await supabaseAdmin.auth.admin.getUserById(
        assignment.traveller_user_id,
      )
      const { data: session } = await supabaseAdmin
        .from('match_sessions')
        .select('destination')
        .eq('id', assignment.match_session_id)
        .single()

      if (traveller?.user?.email) {
        void sendLeadExpiredEmail({
          to: traveller.user.email,
          destination: session?.destination ?? null,
        }).catch((err) => {
          console.error('[expire-pending-leads] Email failed:', err)
        })
      }
    }
  }

  console.info('[expire-pending-leads]', { expired: expiredCount, cascaded: cascadedCount, exhausted: exhaustedCount })
  return NextResponse.json({ expired: expiredCount, cascaded: cascadedCount, exhausted: exhaustedCount })
}
