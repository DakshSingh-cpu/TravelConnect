import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScoreLeadResult } from '@/lib/vetting/scoreLead'

export async function silentBlockLead(
  supabaseAdmin: SupabaseClient,
  assignmentId: string,
  matchSessionId: string | null,
  scoreResult: ScoreLeadResult,
  seonTransactionId: string | null,
): Promise<void> {
  const now = new Date().toISOString()

  await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'blocked',
      vetting_score: scoreResult.vettingScore,
      vetting_result: {
        reasonCodes: scoreResult.reasonCodes,
        decision: scoreResult.decision,
        blockedAt: now,
      },
      seon_transaction_id: seonTransactionId,
      responded_at: now,
    })
    .eq('id', assignmentId)

  if (matchSessionId) {
    await supabaseAdmin
      .from('match_sessions')
      .update({ lead_status: 'blocked' })
      .eq('id', matchSessionId)
  }
}
