export type ChatUser = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export type ChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  text: string
  created_at: string
}

export type InboxConversation = {
  id: string
  updated_at: string
  status?: 'active' | 'archived' | 'completed'
  peer: ChatUser
  lastMessage: ChatMessage | null
}
