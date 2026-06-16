export const GHOST_REPLY_WINDOW_MS = 48 * 60 * 60 * 1000

export type ConversationStatus = 'active' | 'archived' | 'completed'

export function isStaleGhostConversation(
  conv: {
    status: ConversationStatus
    first_advisor_message_at: string | null
    traveller_replied_after_advisor: boolean | null
  },
  nowMs: number = Date.now(),
): boolean {
  if (conv.status !== 'active') return false
  if (!conv.first_advisor_message_at) return false
  if (conv.traveller_replied_after_advisor === true) return false
  const firstMsgMs = new Date(conv.first_advisor_message_at).getTime()
  return nowMs - firstMsgMs >= GHOST_REPLY_WINDOW_MS
}

export function ghostArchiveCutoffIso(nowMs: number = Date.now()): string {
  return new Date(nowMs - GHOST_REPLY_WINDOW_MS).toISOString()
}
