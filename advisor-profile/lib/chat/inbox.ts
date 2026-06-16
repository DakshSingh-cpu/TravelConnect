import { createClient } from '@/lib/supabase/client'
import type { ChatMessage, ChatUser, InboxConversation } from '@/lib/chat/types'

function latestMessageByConversation(messages: ChatMessage[]): Map<string, ChatMessage> {
  const map = new Map<string, ChatMessage>()
  for (const msg of messages) {
    const existing = map.get(msg.conversation_id)
    if (!existing || msg.created_at > existing.created_at) {
      map.set(msg.conversation_id, msg)
    }
  }
  return map
}

export async function fetchInbox(currentUserId: string): Promise<InboxConversation[]> {
  const supabase = createClient()

  const { data: myRows, error: myError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUserId)

  if (myError) {
    throw new Error(myError.message)
  }

  const conversationIds = (myRows ?? []).map((r) => r.conversation_id)
  if (conversationIds.length === 0) {
    return []
  }

  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, updated_at, status')
    .in('id', conversationIds)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  if (convError) {
    throw new Error(convError.message)
  }

  const { data: participants, error: partError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', conversationIds)

  if (partError) {
    throw new Error(partError.message)
  }

  const peerUserIds = [
    ...new Set(
      (participants ?? [])
        .filter((p) => p.user_id !== currentUserId)
        .map((p) => p.user_id),
    ),
  ]

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', peerUserIds)

  if (usersError) {
    throw new Error(usersError.message)
  }

  const usersById = new Map<string, ChatUser>((users ?? []).map((u) => [u.id, u]))

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, text, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  if (msgError) {
    throw new Error(msgError.message)
  }

  const lastByConv = latestMessageByConversation(messages ?? [])
  const peersByConv = new Map<string, ChatUser>()

  for (const row of participants ?? []) {
    if (row.user_id === currentUserId) continue
    const peer = usersById.get(row.user_id)
    if (peer) {
      peersByConv.set(row.conversation_id, peer)
    }
  }

  return (conversations ?? [])
    .map((conv) => {
      const peer = peersByConv.get(conv.id)
      if (!peer) return null
      return {
        id: conv.id,
        updated_at: conv.updated_at,
        peer,
        lastMessage: lastByConv.get(conv.id) ?? null,
      }
    })
    .filter((item): item is InboxConversation => item !== null)
}
