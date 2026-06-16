import { createClient } from '@supabase/supabase-js'
import type { EnrichedMatchedAdvisorV2 } from '@/lib/enrichResults'
import type { ReadinessTier } from '@/lib/advisorBrief'

interface AdvisorPrefRow {
  user_id: string
  min_readiness_score: number
  min_budget_lakh: number
  accept_nurture_leads: boolean
}

/*
 * Uses the service-role client (same pattern as match-sessions/route.ts)
 * to bypass RLS and batch-read all matched advisors' preferences.
 *
 * Future optimization: replace the two sequential queries with a single
 * Postgres view or RPC that joins advisor_user_links -> advisor_preferences
 * in one round-trip (saves ~50-100ms at scale).
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function filterByAdvisorPreferences(
  advisors: EnrichedMatchedAdvisorV2[],
  leadReadinessScore: number,
  leadReadinessTier: ReadinessTier,
  leadBudgetLakh: number,
): Promise<EnrichedMatchedAdvisorV2[]> {
  if (advisors.length === 0) return []

  const routeIds = advisors.map((a) => a.id)

  const { data: links } = await supabaseAdmin
    .from('advisor_user_links')
    .select('advisor_route_id, user_id')
    .in('advisor_route_id', routeIds)

  if (!links || links.length === 0) return advisors

  const userIds = links.map((l) => l.user_id)

  const { data: prefRows } = await supabaseAdmin
    .from('advisor_preferences')
    .select('user_id, min_readiness_score, min_budget_lakh, accept_nurture_leads')
    .in('user_id', userIds)

  const linkMap = new Map(links.map((l) => [l.advisor_route_id, l.user_id]))
  const prefMap = new Map((prefRows ?? []).map((p) => [p.user_id, p as AdvisorPrefRow]))

  return advisors.filter((advisor) => {
    const userId = linkMap.get(advisor.id)
    if (!userId) return true

    const prefs = prefMap.get(userId)
    if (!prefs) return true

    if (leadReadinessTier === 'nurture' && !prefs.accept_nurture_leads) return false

    if (leadReadinessTier !== 'nurture' && leadReadinessScore < prefs.min_readiness_score) return false

    if (leadBudgetLakh < prefs.min_budget_lakh) return false

    return true
  })
}
