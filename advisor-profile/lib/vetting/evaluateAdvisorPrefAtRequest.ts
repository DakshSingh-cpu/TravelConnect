import { createClient } from '@supabase/supabase-js'
import type { ReadinessTier } from '@/lib/advisorBrief'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function evaluateAdvisorPrefAtRequest(
  advisorUserId: string,
  session: {
    readiness_score: number | null
    readiness_tier: string | null
    budget_lakh: number | null
  },
): Promise<{ allowed: boolean; reasonCode?: string }> {
  const { data: prefs } = await supabaseAdmin
    .from('advisor_preferences')
    .select('min_readiness_score, min_budget_lakh, accept_nurture_leads')
    .eq('user_id', advisorUserId)
    .maybeSingle()

  if (!prefs) return { allowed: true }

  const tier = (session.readiness_tier ?? 'warm') as ReadinessTier
  const score = session.readiness_score ?? 50
  const budget = session.budget_lakh ?? 0

  if (tier === 'nurture' && !prefs.accept_nurture_leads) {
    return { allowed: false, reasonCode: 'ADVISOR_NURTURE_REJECT' }
  }

  if (tier !== 'nurture' && score < prefs.min_readiness_score) {
    return { allowed: false, reasonCode: 'ADVISOR_MIN_READINESS' }
  }

  if (budget < prefs.min_budget_lakh) {
    return { allowed: false, reasonCode: 'ADVISOR_MIN_BUDGET' }
  }

  return { allowed: true }
}
