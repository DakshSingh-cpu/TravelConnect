import { createClient } from '@supabase/supabase-js'
import { lookupZipAffluenceTier } from '@/lib/vetting/zipAffluence'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type QuarantineLead = {
  assignmentId: string
  status: string
  vettingScore: number | null
  reasonCodes: string[]
  destination: string | null
  budgetLakh: number | null
  readinessTier: string | null
  residentialZip: string | null
  affluenceTier: number | null
  travellerName: string | null
  createdAt: string
}

export async function fetchQuarantineLeads(includeDismissed = false): Promise<QuarantineLead[]> {
  const statuses = includeDismissed ? ['blocked', 'dismissed'] : ['blocked']

  const { data: rows } = await supabaseAdmin
    .from('lead_assignments')
    .select('id, status, vetting_score, vetting_result, match_session_id, traveller_user_id, created_at')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!rows?.length) return []

  const sessionIds = rows.map((r) => r.match_session_id).filter(Boolean) as string[]
  const userIds = [...new Set(rows.map((r) => r.traveller_user_id))]

  const [sessions, users] = await Promise.all([
    sessionIds.length
      ? supabaseAdmin.from('match_sessions').select('*').in('id', sessionIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin.from('users').select('id, full_name').in('id', userIds),
  ])

  const sessionMap = new Map((sessions.data ?? []).map((s) => [s.id, s]))
  const userMap = new Map((users.data ?? []).map((u) => [u.id, u]))

  return rows.map((row) => {
    const session = row.match_session_id ? sessionMap.get(row.match_session_id) : null
    const traveller = userMap.get(row.traveller_user_id)
    const vr = row.vetting_result as { reasonCodes?: string[] } | null
    const zip = session?.residential_zip ?? null

    return {
      assignmentId: row.id,
      status: row.status,
      vettingScore: row.vetting_score,
      reasonCodes: vr?.reasonCodes ?? [],
      destination: session?.destination ?? null,
      budgetLakh: session?.budget_lakh ?? null,
      readinessTier: session?.readiness_tier ?? null,
      residentialZip: zip,
      affluenceTier: zip ? lookupZipAffluenceTier(zip) : null,
      travellerName: traveller?.full_name ?? null,
      createdAt: row.created_at,
    }
  })
}
