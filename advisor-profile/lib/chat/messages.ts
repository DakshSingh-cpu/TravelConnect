import { createClient } from '@/lib/supabase/client'
import type { ChatMessage } from '@/lib/chat/types'

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, text, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function sendMessage(
  conversationId: string,
  text: string,
  senderId: string,
): Promise<ChatMessage> {
  const supabase = createClient()
  const trimmed = text.trim()

  if (!trimmed) {
    throw new Error('Message cannot be empty')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      text: trimmed,
    })
    .select('id, conversation_id, sender_id, text, created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
