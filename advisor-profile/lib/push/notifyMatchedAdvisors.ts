import { createClient } from '@supabase/supabase-js'
import { advisorIdForAgency } from '@/lib/matchAdvisors'
import { sendExpoPushNotifications, type ExpoPushMessage } from '@/lib/push/expoPush'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type NotifyParams = {
  matchSessionId: string
  advisorAgencyIds: number[]
  destination: string | null
}

/**
 * Notify linked advisor accounts when a new traveller match session is created.
 * Fire-and-forget from the match-sessions API route.
 */
export async function notifyMatchedAdvisors({
  matchSessionId,
  advisorAgencyIds,
  destination,
}: NotifyParams): Promise<void> {
  if (advisorAgencyIds.length === 0) return

  const advisorRouteIds = advisorAgencyIds.map((id) => advisorIdForAgency(id))

  const { data: links, error: linksError } = await supabaseAdmin
    .from('advisor_user_links')
    .select('user_id')
    .in('advisor_route_id', advisorRouteIds)

  if (linksError || !links?.length) {
    if (linksError) {
      console.error('[notify-matched-advisors] advisor_user_links', linksError.message)
    }
    return
  }

  const userIds = [...new Set(links.map((l) => l.user_id))]

  const { data: tokens, error: tokensError } = await supabaseAdmin
    .from('push_tokens')
    .select('expo_push_token')
    .in('user_id', userIds)

  if (tokensError) {
    console.error('[notify-matched-advisors] push_tokens', tokensError.message)
    return
  }

  if (!tokens?.length) return

  const label = destination?.trim() || 'a new destination'
  const messages: ExpoPushMessage[] = tokens.map((row) => ({
    to: row.expo_push_token,
    title: 'New traveler match',
    body: `Someone is planning a trip to ${label}. Tap to view details.`,
    sound: 'default',
    priority: 'high',
    data: {
      type: 'new_match',
      matchSessionId,
    },
  }))

  const { sent, failed } = await sendExpoPushNotifications(messages)
  console.info('[notify-matched-advisors]', { matchSessionId, sent, failed })
}
