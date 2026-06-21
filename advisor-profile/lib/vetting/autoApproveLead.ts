import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/supabase/database.types'
import { findOrCreateDirectConversationAdmin } from '@/lib/chat/findOrCreateDirectConversationAdmin'
import { sendExpoPushNotifications } from '@/lib/push/expoPush'

export async function autoApproveLead(
  supabaseAdmin: SupabaseClient,
  assignment: {
    id: string
    match_session_id: string | null
    traveller_user_id: string
    advisor_user_id: string
    advisor_route_id: string
    conversation_id?: string | null
  },
  brief?: Json | null,
): Promise<{ conversationId: string } | null> {
  const now = new Date().toISOString()

  let conversationId = assignment.conversation_id ?? null

  if (!conversationId) {
    conversationId = await findOrCreateDirectConversationAdmin(
      supabaseAdmin,
      assignment.advisor_user_id,
      assignment.traveller_user_id,
    )
  }

  if (!conversationId) return null

  if (assignment.match_session_id) {
    await supabaseAdmin
      .from('conversations')
      .update({
        match_session_id: assignment.match_session_id,
        lead_assignment_id: assignment.id,
      })
      .eq('id', conversationId)
  }

  if (brief) {
    await supabaseAdmin.from('conversation_briefs').upsert(
      { conversation_id: conversationId, brief },
      { onConflict: 'conversation_id' },
    )
  }

  await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'approved',
      conversation_id: conversationId,
      approved_at: now,
      email_sent_at: null,
      chat_unlocked_at: null,
      responded_at: now,
    })
    .eq('id', assignment.id)

  if (assignment.match_session_id) {
    await supabaseAdmin
      .from('match_sessions')
      .update({ lead_status: 'accepted' })
      .eq('id', assignment.match_session_id)
  }

  void notifyAdvisorApproved(supabaseAdmin, assignment.advisor_user_id, assignment.match_session_id)

  return { conversationId }
}

async function notifyAdvisorApproved(
  supabaseAdmin: SupabaseClient,
  advisorUserId: string,
  matchSessionId: string | null,
): Promise<void> {
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', advisorUserId)

  if (!tokens?.length) return

  await sendExpoPushNotifications(
    tokens.map((t) => ({
      to: t.expo_push_token,
      title: 'New verified client',
      body: 'A traveller has been connected to your inbox.',
      sound: 'default',
      priority: 'high',
      data: {
        type: 'client_connected',
        matchSessionId: matchSessionId ?? '',
      },
    })),
  )
}
