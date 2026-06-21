import type { SupabaseClient } from '@supabase/supabase-js'

export type DuplicatePairGroup = {
  userA: string
  userB: string
  conversationIds: string[]
}

export type MergeDuplicateResult = {
  groupsProcessed: number
  conversationsArchived: number
  messagesMoved: number
  assignmentsUpdated: number
  details: Array<{
    userA: string
    userB: string
    canonicalId: string
    archivedIds: string[]
    messagesMoved: number
  }>
}

type ConvMeta = {
  id: string
  updated_at: string
  messageCount: number
}

/** Groups 1:1 conversations that share the same two participants. */
export async function findDuplicateDirectConversationGroups(
  admin: SupabaseClient,
): Promise<DuplicatePairGroup[]> {
  const { data: participants, error } = await admin
    .from('conversation_participants')
    .select('conversation_id, user_id')

  if (error || !participants?.length) return []

  const usersByConv = new Map<string, string[]>()
  for (const row of participants) {
    const list = usersByConv.get(row.conversation_id) ?? []
    list.push(row.user_id)
    usersByConv.set(row.conversation_id, list)
  }

  const pairToConvs = new Map<string, string[]>()

  for (const [convId, userIds] of usersByConv) {
    if (userIds.length !== 2) continue
    const [a, b] = [...userIds].sort()
    const key = `${a}:${b}`
    const list = pairToConvs.get(key) ?? []
    list.push(convId)
    pairToConvs.set(key, list)
  }

  const groups: DuplicatePairGroup[] = []
  for (const [key, conversationIds] of pairToConvs) {
    if (conversationIds.length < 2) continue
    const [userA, userB] = key.split(':')
    groups.push({ userA, userB, conversationIds })
  }

  return groups
}

async function loadConversationMeta(
  admin: SupabaseClient,
  conversationIds: string[],
): Promise<ConvMeta[]> {
  const { data: convs } = await admin
    .from('conversations')
    .select('id, updated_at, status')
    .in('id', conversationIds)

  const meta: ConvMeta[] = []
  for (const conv of convs ?? []) {
    const { count } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)

    meta.push({
      id: conv.id,
      updated_at: conv.updated_at,
      messageCount: count ?? 0,
    })
  }

  return meta
}

/** Prefer the thread with the most messages; tie-break on latest activity. */
export function pickCanonicalConversationId(meta: ConvMeta[]): string {
  const sorted = [...meta].sort((a, b) => {
    if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount
    return b.updated_at.localeCompare(a.updated_at)
  })
  return sorted[0].id
}

/**
 * Merges duplicate 1:1 threads: moves messages, repoints lead assignments,
 * archives superseded conversations.
 */
export async function mergeDuplicateConversations(
  admin: SupabaseClient,
): Promise<MergeDuplicateResult> {
  const groups = await findDuplicateDirectConversationGroups(admin)
  const result: MergeDuplicateResult = {
    groupsProcessed: 0,
    conversationsArchived: 0,
    messagesMoved: 0,
    assignmentsUpdated: 0,
    details: [],
  }

  for (const group of groups) {
    const meta = await loadConversationMeta(admin, group.conversationIds)
    if (meta.length < 2) continue

    const canonicalId = pickCanonicalConversationId(meta)
    const duplicateIds = group.conversationIds.filter((id) => id !== canonicalId)
    if (duplicateIds.length === 0) continue

    let messagesMoved = 0

    for (const dupId of duplicateIds) {
      const { data: msgs } = await admin
        .from('messages')
        .select('id')
        .eq('conversation_id', dupId)

      if (msgs?.length) {
        const { error: moveError } = await admin
          .from('messages')
          .update({ conversation_id: canonicalId })
          .eq('conversation_id', dupId)

        if (moveError) {
          throw new Error(`Failed to move messages from ${dupId}: ${moveError.message}`)
        }
        messagesMoved += msgs.length
      }

      const { data: brief } = await admin
        .from('conversation_briefs')
        .select('brief')
        .eq('conversation_id', dupId)
        .maybeSingle()

      if (brief) {
        const { data: existingBrief } = await admin
          .from('conversation_briefs')
          .select('conversation_id')
          .eq('conversation_id', canonicalId)
          .maybeSingle()

        if (!existingBrief) {
          await admin.from('conversation_briefs').upsert(
            { conversation_id: canonicalId, brief: brief.brief },
            { onConflict: 'conversation_id' },
          )
        }

        await admin.from('conversation_briefs').delete().eq('conversation_id', dupId)
      }

      const { data: assignments } = await admin
        .from('lead_assignments')
        .select('id')
        .eq('conversation_id', dupId)

      if (assignments?.length) {
        const { error: assignError } = await admin
          .from('lead_assignments')
          .update({ conversation_id: canonicalId })
          .eq('conversation_id', dupId)

        if (assignError) {
          throw new Error(`Failed to repoint assignments from ${dupId}: ${assignError.message}`)
        }
        result.assignmentsUpdated += assignments.length
      }

      const { error: archiveError } = await admin
        .from('conversations')
        .update({ status: 'archived' })
        .eq('id', dupId)

      if (archiveError) {
        throw new Error(`Failed to archive ${dupId}: ${archiveError.message}`)
      }

      result.conversationsArchived += 1
    }

    await admin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', canonicalId)

    result.groupsProcessed += 1
    result.messagesMoved += messagesMoved
    result.details.push({
      userA: group.userA,
      userB: group.userB,
      canonicalId,
      archivedIds: duplicateIds,
      messagesMoved,
    })
  }

  return result
}
