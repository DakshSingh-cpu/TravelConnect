import { createClient } from '@/lib/supabase/client'
import { advisorBriefSchema } from '@/lib/advisorBrief'
import type { AdvisorBrief } from '@/lib/advisorBrief'

/**
 * Saves an AdvisorBrief for a conversation.
 * Called by the traveller side when they open a chat — upserts so re-opens are idempotent.
 */
export async function saveConversationBrief(
  conversationId: string,
  brief: AdvisorBrief,
): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('conversation_briefs').upsert(
    { conversation_id: conversationId, brief },
    { onConflict: 'conversation_id' },
  )
}

/**
 * Fetches the AdvisorBrief for a conversation (called on the advisor side).
 * Returns null if none exists or on parse failure.
 */
export async function fetchConversationBrief(
  conversationId: string,
): Promise<AdvisorBrief | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('conversation_briefs')
    .select('brief')
    .eq('conversation_id', conversationId)
    .maybeSingle()

  if (error || !data) return null

  const parsed = advisorBriefSchema.safeParse(data.brief)
  return parsed.success ? parsed.data : null
}
