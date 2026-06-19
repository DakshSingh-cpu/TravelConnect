import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/supabase/database.types'
import { validateTelemetry } from '@/lib/telemetry/validateTelemetry'
import { evaluateAdvisorPrefAtRequest } from '@/lib/vetting/evaluateAdvisorPrefAtRequest'
import { fetchSeonResult } from '@/lib/vetting/seon'
import { scoreLead } from '@/lib/vetting/scoreLead'
import { autoApproveLead } from '@/lib/vetting/autoApproveLead'
import { silentBlockLead } from '@/lib/vetting/silentBlockLead'

const MAX_VETTING_ATTEMPTS = 5

function getClientIp(request?: Request): string {
  if (!request) return '0.0.0.0'
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? '0.0.0.0'
  return request.headers.get('x-real-ip')?.trim() ?? '0.0.0.0'
}

export async function runLeadVetting(
  supabaseAdmin: SupabaseClient,
  assignmentId: string,
  context: {
    email: string
    phone: string
    userId: string
    request?: Request
    brief?: Json | null
  },
): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from('lead_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single()

  if (!row || row.status !== 'vetting') return

  const nextAttempts = (row.vetting_attempts ?? 0) + 1
  await supabaseAdmin
    .from('lead_assignments')
    .update({ vetting_attempts: nextAttempts })
    .eq('id', assignmentId)
    .eq('status', 'vetting')

  if (nextAttempts > MAX_VETTING_ATTEMPTS) {
    await silentBlockLead(
      supabaseAdmin,
      assignmentId,
      row.match_session_id,
      {
        vettingScore: 0,
        decision: 'block',
        reasonCodes: ['VETTING_WORKER_EXHAUSTED'],
      },
      null,
    )
    return
  }

  try {
    let session: {
      readiness_score: number | null
      readiness_tier: string | null
      budget_lakh: number | null
      residential_zip: string | null
    } | null = null

    if (row.match_session_id) {
      const { data } = await supabaseAdmin
        .from('match_sessions')
        .select('readiness_score, readiness_tier, budget_lakh, residential_zip')
        .eq('id', row.match_session_id)
        .single()
      session = data
    }

    const { data: telemetryRow } = row.match_session_id
      ? await supabaseAdmin
          .from('session_telemetry')
          .select('payload')
          .eq('match_session_id', row.match_session_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null }

    const telemetry = validateTelemetry(telemetryRow?.payload ?? {})

    const seon = await fetchSeonResult(supabaseAdmin, {
      email: context.email,
      phone: context.phone,
      ip: getClientIp(context.request),
      userId: context.userId,
    })

    const pref = await evaluateAdvisorPrefAtRequest(row.advisor_user_id, {
      readiness_score: session?.readiness_score ?? null,
      readiness_tier: session?.readiness_tier ?? null,
      budget_lakh: session?.budget_lakh ?? null,
    })

    const scoreResult = scoreLead({
      telemetry,
      seon,
      readinessTier: session?.readiness_tier ?? null,
      residentialZip: session?.residential_zip ?? null,
      advisorPrefAllowed: pref.allowed,
      advisorPrefReason: pref.reasonCode,
    })

    console.info('[vetting]', {
      assignmentId,
      decision: scoreResult.decision,
      score: scoreResult.vettingScore,
      reasonCodes: scoreResult.reasonCodes,
      attempts: nextAttempts,
    })

    if (scoreResult.decision === 'pass') {
      await supabaseAdmin
        .from('lead_assignments')
        .update({
          vetting_score: scoreResult.vettingScore,
          vetting_result: { reasonCodes: scoreResult.reasonCodes, decision: 'pass' },
          seon_transaction_id: seon?.rawTransactionId ?? null,
        })
        .eq('id', assignmentId)

      await autoApproveLead(supabaseAdmin, row, context.brief ?? null)
    } else {
      await silentBlockLead(
        supabaseAdmin,
        assignmentId,
        row.match_session_id,
        scoreResult,
        seon?.rawTransactionId ?? null,
      )
    }
  } catch (err) {
    console.error('[vetting] run failed', assignmentId, err)
  }
}
