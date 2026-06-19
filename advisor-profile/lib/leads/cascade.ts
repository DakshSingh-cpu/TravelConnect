import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * After a rejection or expiry, find the next ranked advisor from match_sessions.advisor_ids
 * that hasn't been assigned yet, and create a new pending lead_assignment.
 * Returns the new assignment ID, or null if all advisors have been tried (exhausted).
 */
export async function cascadeToNextAdvisor(
  supabaseAdmin: SupabaseClient,
  matchSessionId: string,
  travellerId: string,
): Promise<{ assignmentId: string; advisorRouteId: string } | null> {
  const { data: session } = await supabaseAdmin
    .from('match_sessions')
    .select('advisor_ids')
    .eq('id', matchSessionId)
    .single()

  if (!session?.advisor_ids?.length) {
    await markExhausted(supabaseAdmin, matchSessionId)
    return null
  }

  const { data: existingAssignments } = await supabaseAdmin
    .from('lead_assignments')
    .select('advisor_route_id, rank')
    .eq('match_session_id', matchSessionId)

  const triedRouteIds = new Set((existingAssignments ?? []).map((a) => a.advisor_route_id))
  const maxRank = Math.max(0, ...(existingAssignments ?? []).map((a) => a.rank))

  const advisorIds: number[] = session.advisor_ids
  let nextAgencyId: number | null = null
  for (const agencyId of advisorIds) {
    const routeId = `agency-${agencyId}`
    if (!triedRouteIds.has(routeId)) {
      nextAgencyId = agencyId
      break
    }
  }

  if (nextAgencyId === null) {
    await markExhausted(supabaseAdmin, matchSessionId)
    return null
  }

  const nextRouteId = `agency-${nextAgencyId}`

  const { data: link } = await supabaseAdmin
    .from('advisor_user_links')
    .select('user_id')
    .eq('advisor_route_id', nextRouteId)
    .maybeSingle()

  if (!link?.user_id) {
    await markExhausted(supabaseAdmin, matchSessionId)
    return null
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('lead_assignments')
    .insert({
      match_session_id: matchSessionId,
      traveller_user_id: travellerId,
      advisor_user_id: link.user_id,
      advisor_route_id: nextRouteId,
      rank: maxRank + 1,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('[cascade] Insert failed:', error?.message)
    return null
  }

  return { assignmentId: inserted.id, advisorRouteId: nextRouteId }
}

async function markExhausted(supabaseAdmin: SupabaseClient, matchSessionId: string): Promise<void> {
  await supabaseAdmin
    .from('match_sessions')
    .update({ lead_status: 'exhausted' })
    .eq('id', matchSessionId)
}
