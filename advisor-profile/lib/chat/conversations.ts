import { createClient } from '@/lib/supabase/client'
import { ensureMyProfile } from '@/lib/chat/ensureProfile'
import { saveConversationBrief } from '@/lib/chat/conversationBrief'
import { readAdvisorBrief } from '@/lib/advisorBrief'

/** Resolve a Supabase user id from an app advisor route id (e.g. `agency-123`). */
export async function resolveAdvisorUserId(advisorRouteId: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('advisor_user_links')
    .select('user_id')
    .eq('advisor_route_id', advisorRouteId)
    .maybeSingle()

  if (error) {
    console.error('[chat] resolveAdvisorUserId', error)
    return null
  }

  return data?.user_id ?? null
}

/**
 * Returns an existing 1:1 conversation with `peerUserId`, or creates one via RPC.
 * Requires an active Supabase session.
 */
export async function getOrCreateDirectConversation(peerUserId: string): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    peer_user_id: peerUserId,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Conversation could not be created')
  }

  return data
}

/**
 * Opens chat with an advisor: resolves their auth user, then finds/creates the conversation.
 * Returns `{ conversationId }` or `{ needsAuth: true }` when there is no session.
 */
export async function openChatWithAdvisor(advisorRouteId: string): Promise<
  | { ok: true; conversationId: string }
  | { ok: false; reason: 'not_authenticated' }
  | { ok: false; reason: 'advisor_not_linked'; advisorRouteId: string }
> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { ok: false, reason: 'not_authenticated' }
  }

  await ensureMyProfile()

  const peerUserId = await resolveAdvisorUserId(advisorRouteId)
  if (!peerUserId) {
    return { ok: false, reason: 'advisor_not_linked', advisorRouteId }
  }

  const conversationId = await getOrCreateDirectConversation(peerUserId)

  // Fire-and-forget: persist brief so advisor can read it cross-client
  const brief = readAdvisorBrief()
  if (brief) {
    void saveConversationBrief(conversationId, brief)
  }

  return { ok: true, conversationId }
}
