import type { SupabaseClient } from '@supabase/supabase-js'

export async function adminDismissLead(
  supabaseAdmin: SupabaseClient,
  assignmentId: string,
  adminUserId: string,
  reason?: string,
): Promise<void> {
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('vetting_result, match_session_id')
    .eq('id', assignmentId)
    .single()

  if (!assignment) throw new Error('Assignment not found')

  const now = new Date().toISOString()
  const prior =
    assignment.vetting_result && typeof assignment.vetting_result === 'object'
      ? assignment.vetting_result
      : {}

  await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'dismissed',
      responded_at: now,
      vetting_result: {
        ...prior,
        audit: [
          ...((prior as { audit?: unknown[] }).audit ?? []),
          { action: 'admin_dismissed', adminUserId, at: now, reason: reason ?? null },
        ],
      },
    })
    .eq('id', assignmentId)

  if (assignment.match_session_id) {
    await supabaseAdmin
      .from('match_sessions')
      .update({ lead_status: 'blocked' })
      .eq('id', assignment.match_session_id)
  }
}
