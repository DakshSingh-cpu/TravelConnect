import { createClient } from '@/lib/supabase/client'
import type { ChatUser } from '@/lib/chat/types'

/** Load the other participant in a 1:1 conversation. */
export async function fetchConversationPeer(
  conversationId: string,
  currentUserId: string,
): Promise<ChatUser | null> {
  const supabase = createClient()

  const { data: participants, error: partError } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)

  if (partError) {
    throw new Error(partError.message)
  }

  const peerId = (participants ?? []).map((p) => p.user_id).find((id) => id !== currentUserId)
  if (!peerId) return null

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .eq('id', peerId)
    .maybeSingle()

  if (userError) {
    throw new Error(userError.message)
  }

  return user
}
