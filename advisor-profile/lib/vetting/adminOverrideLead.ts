import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/supabase/database.types'
import { adminOverrideEmailImmediate } from '@/lib/featureFlags'
import { sendTravelerAcceptedEmail } from '@/lib/email/resend'
import { getSiteUrl } from '@/lib/siteUrl'
import { autoApproveLead } from '@/lib/vetting/autoApproveLead'

export async function adminOverrideLead(
  supabaseAdmin: SupabaseClient,
  assignmentId: string,
  adminUserId: string,
): Promise<{ conversationId: string | null; status: string }> {
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single()

  if (!assignment) {
    throw new Error('Assignment not found')
  }

  if (assignment.status === 'approved' && assignment.conversation_id) {
    return { conversationId: assignment.conversation_id, status: 'approved' }
  }

  const brief = await loadBrief(supabaseAdmin, assignment.match_session_id)

  const result = await autoApproveLead(supabaseAdmin, assignment, brief)
  if (!result) throw new Error('Could not approve lead')

  const audit = {
    action: 'admin_override',
    adminUserId,
    at: new Date().toISOString(),
  }

  await supabaseAdmin
    .from('lead_assignments')
    .update({
      vetting_result: {
        ...(typeof assignment.vetting_result === 'object' ? assignment.vetting_result : {}),
        audit: [audit],
      },
    })
    .eq('id', assignmentId)

  if (adminOverrideEmailImmediate()) {
    await sendDelayedEmailNow(supabaseAdmin, assignmentId, assignment.traveller_user_id, result.conversationId)
  }

  return { conversationId: result.conversationId, status: 'approved' }
}

async function loadBrief(
  supabaseAdmin: SupabaseClient,
  matchSessionId: string | null,
): Promise<Json | null> {
  if (!matchSessionId) return null
  return null
}

async function sendDelayedEmailNow(
  supabaseAdmin: SupabaseClient,
  assignmentId: string,
  travellerUserId: string,
  conversationId: string,
): Promise<void> {
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(travellerUserId)
  if (!user?.user?.email) return

  const now = new Date().toISOString()
  const chatUrl = `${getSiteUrl()}/chat/${conversationId}`

  await sendTravelerAcceptedEmail({
    to: user.user.email,
    advisorName: 'Your advisor',
    destination: null,
    chatUrl,
  })

  await supabaseAdmin
    .from('lead_assignments')
    .update({ email_sent_at: now, chat_unlocked_at: now })
    .eq('id', assignmentId)
}
