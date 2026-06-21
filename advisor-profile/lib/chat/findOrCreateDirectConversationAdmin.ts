import type { SupabaseClient } from '@supabase/supabase-js'
import { pickCanonicalConversationId } from '@/lib/chat/mergeDuplicateConversations'

/**
 * Finds an existing 1:1 conversation between two users (service-role safe).
 * Mirrors the participant-matching logic in get_or_create_direct_conversation.
 * When multiple duplicates exist, returns the most recently updated thread.
 */
export async function findExistingDirectConversationAdmin(
  admin: SupabaseClient,
  userIdA: string,
  userIdB: string,
): Promise<string | null> {
  if (!userIdA || !userIdB || userIdA === userIdB) return null

  const { data: participants, error } = await admin
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('user_id', [userIdA, userIdB])

  if (error || !participants?.length) return null

  const usersByConv = new Map<string, Set<string>>()
  for (const row of participants) {
    const set = usersByConv.get(row.conversation_id) ?? new Set<string>()
    set.add(row.user_id)
    usersByConv.set(row.conversation_id, set)
  }

  const candidateIds: string[] = []
  for (const [convId, users] of usersByConv) {
    if (!users.has(userIdA) || !users.has(userIdB)) continue

    const { count, error: countError } = await admin
      .from('conversation_participants')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', convId)

    if (!countError && count === 2) {
      candidateIds.push(convId)
    }
  }

  if (candidateIds.length === 0) return null
  if (candidateIds.length === 1) return candidateIds[0]

  const { data: convs } = await admin
    .from('conversations')
    .select('id, updated_at, status')
    .in('id', candidateIds)
    .eq('status', 'active')

  const activeIds = (convs ?? []).map((c) => c.id)
  const pool = activeIds.length > 0 ? activeIds : candidateIds

  const meta = await Promise.all(
    pool.map(async (id) => {
      const { count } = await admin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', id)

      const conv = (convs ?? []).find((c) => c.id === id)
      return {
        id,
        updated_at: conv?.updated_at ?? '',
        messageCount: count ?? 0,
      }
    }),
  )

  return pickCanonicalConversationId(meta)
}

/** Reuses an existing 1:1 thread or creates a new conversation with both participants. */
export async function findOrCreateDirectConversationAdmin(
  admin: SupabaseClient,
  userIdA: string,
  userIdB: string,
): Promise<string | null> {
  const existing = await findExistingDirectConversationAdmin(admin, userIdA, userIdB)
  if (existing) return existing

  const { data: conv, error } = await admin
    .from('conversations')
    .insert({})
    .select('id')
    .single()

  if (error || !conv) return null

  const { error: partError } = await admin.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: userIdA },
    { conversation_id: conv.id, user_id: userIdB },
  ])

  if (partError) return null
  return conv.id
}
