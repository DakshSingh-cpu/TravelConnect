import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { advisorBriefSchema, readAdvisorBrief } from '@/lib/advisorBrief'
import type { AdvisorBrief } from '@/lib/advisorBrief'

export type SaveConversationBriefResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Saves an AdvisorBrief for a conversation.
 * Called by the traveller side when they open a chat — upserts so re-opens are idempotent.
 */
export async function saveConversationBrief(
  conversationId: string,
  brief: AdvisorBrief,
): Promise<SaveConversationBriefResult> {
  const supabase = createClient()
  const { error } = await supabase.from('conversation_briefs').upsert(
    { conversation_id: conversationId, brief: brief as unknown as Json },
    { onConflict: 'conversation_id' },
  )

  if (error) {
    console.error('[conversation_briefs] upsert failed', { code: error.code })
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Fetches the AdvisorBrief for a conversation (called on the advisor side).
 * Returns null if none exists or on parse failure.
 */
export async function fetchConversationBrief(
  conversationId: string,
): Promise<AdvisorBrief | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('conversation_briefs')
    .select('brief')
    .eq('conversation_id', conversationId)
    .maybeSingle()

  if (error || !data) return null

  const parsed = advisorBriefSchema.safeParse(data.brief)
  return parsed.success ? parsed.data : null
}

/**
 * If the traveller has a session brief and this conversation has none yet, persist it.
 */
export async function syncSessionBriefToConversation(
  conversationId: string,
): Promise<SaveConversationBriefResult | { ok: true; skipped: true }> {
  const sessionBrief = readAdvisorBrief()
  if (!sessionBrief) {
    return { ok: true, skipped: true }
  }

  const existing = await fetchConversationBrief(conversationId)
  if (existing) {
    return { ok: true, skipped: true }
  }

  return saveConversationBrief(conversationId, sessionBrief)
}
