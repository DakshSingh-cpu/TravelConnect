import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from './constants'

export type LeadAssignmentRow = {
  id: string
  status: string
  vetting_score: number | null
  email_sent_at: string | null
  approved_at: string | null
  traveller_user_id: string
  created_at: string
}

function requireAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for E2E (see e2e/env.example).',
    )
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createAdminClient(): SupabaseClient {
  return requireAdmin()
}

export type TestUser = {
  id: string
  email: string
  password: string
}

/** Create a confirmed traveller account for isolated E2E runs. */
export async function createTestTraveller(label: string): Promise<TestUser> {
  const admin = requireAdmin()
  const email = `e2e-${label}-${Date.now()}@travelconnect-e2e.test`
  const password = `E2e_${Date.now()}_Aa1!`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${label}` },
  })

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? 'unknown'}`)
  }

  await admin.from('users').upsert({
    id: data.user.id,
    full_name: `E2E ${label}`,
    account_role: 'traveller',
  })

  return { id: data.user.id, email, password }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = requireAdmin()
  await admin.from('lead_assignments').delete().eq('traveller_user_id', userId)
  await admin.auth.admin.deleteUser(userId)
}

export async function getLatestLeadAssignment(
  travellerUserId: string,
): Promise<LeadAssignmentRow | null> {
  const admin = requireAdmin()
  const { data, error } = await admin
    .from('lead_assignments')
    .select('id, status, vetting_score, email_sent_at, approved_at, traveller_user_id, created_at')
    .eq('traveller_user_id', travellerUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`lead_assignments query failed: ${error.message}`)
  return data as LeadAssignmentRow | null
}

/** Poll until vetting finishes (status leaves `vetting`). */
export async function waitForVettingComplete(
  travellerUserId: string,
  timeoutMs = 90_000,
): Promise<LeadAssignmentRow> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const row = await getLatestLeadAssignment(travellerUserId)
    if (row && row.status !== 'vetting') return row
    await sleep(1_500)
  }
  throw new Error(`Vetting did not complete within ${timeoutMs}ms for user ${travellerUserId}`)
}

/** Satisfy send-delayed-emails cutoff (approved_at must be older than EMAIL_DELAY_MINUTES). */
export async function backdateApprovedAt(assignmentId: string, minutesAgo = 20): Promise<void> {
  const admin = requireAdmin()
  const approvedAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
  const { error } = await admin
    .from('lead_assignments')
    .update({ approved_at: approvedAt })
    .eq('id', assignmentId)
  if (error) throw new Error(`backdate approved_at failed: ${error.message}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
