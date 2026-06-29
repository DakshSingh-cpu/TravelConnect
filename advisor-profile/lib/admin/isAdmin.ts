import type { SupabaseClient } from '@supabase/supabase-js'

type AdminProfile = {
  account_role: string
  email?: string | null
}

function adminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isAdminUser(profile: AdminProfile): boolean {
  if (profile.account_role === 'admin') return true
  const email = profile.email?.trim().toLowerCase()
  if (!email) return false
  return adminEmailAllowlist().has(email)
}

/**
 * Authoritative admin check for a given auth user id.
 *
 * Reads `account_role` via the service-role client (bypasses RLS) — the column
 * is DB-locked against self-promotion (see migration 20250626120000), so it can
 * be trusted. The email allowlist is resolved from the verified email on
 * auth.users (never from a client-supplied value).
 *
 * Use this from server routes / server components instead of trusting any
 * client-provided role or email.
 */
export async function resolveIsAdmin(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('account_role')
    .eq('id', userId)
    .single()

  if (profile?.account_role === 'admin') return true

  // Only consult the allowlist if it is configured (avoids an extra admin API
  // round-trip for the common non-admin case).
  if (adminEmailAllowlist().size === 0) return false

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  return isAdminUser({
    account_role: profile?.account_role ?? 'traveller',
    email: authUser?.user?.email,
  })
}
