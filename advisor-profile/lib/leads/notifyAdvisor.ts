import type { SupabaseClient } from '@supabase/supabase-js'
import { sendExpoPushNotifications, type ExpoPushMessage } from '@/lib/push/expoPush'

export async function notifyAdvisorOfPendingLead(
  supabaseAdmin: SupabaseClient,
  advisorUserId: string,
  destination: string | null,
  assignmentId: string,
): Promise<void> {
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', advisorUserId)

  if (!tokens?.length) return

  const label = destination?.trim() || 'a new destination'
  const messages: ExpoPushMessage[] = tokens.map((row) => ({
    to: row.expo_push_token,
    title: 'New lead request',
    body: `A traveler planning a trip to ${label} wants to connect. Review and accept in your inbox.`,
    sound: 'default',
    priority: 'high',
    data: {
      type: 'lead_request',
      assignmentId,
    },
  }))

  const { sent, failed } = await sendExpoPushNotifications(messages)
  console.info('[notify-advisor-lead]', { assignmentId, sent, failed })
}
