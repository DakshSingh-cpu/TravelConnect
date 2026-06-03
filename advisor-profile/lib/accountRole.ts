import { createClient } from '@/lib/supabase/client'

export type AccountRole = 'traveller' | 'advisor'

export const ACCOUNT_ROLE_INTENT_KEY = 'tbo_account_role_intent'

export function readAccountRoleIntent(): AccountRole | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ACCOUNT_ROLE_INTENT_KEY)
    if (raw === 'traveller' || raw === 'advisor') return raw
  } catch {
    /* ignore */
  }
  return null
}

export function persistAccountRoleIntent(role: AccountRole): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(ACCOUNT_ROLE_INTENT_KEY, role)
  } catch {
    /* ignore */
  }
}

export function clearAccountRoleIntent(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(ACCOUNT_ROLE_INTENT_KEY)
  } catch {
    /* ignore */
  }
}

/** Fetch persisted role from public.users (null if missing / error). */
export async function fetchMyAccountRole(): Promise<AccountRole | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data, error } = await supabase
    .from('users')
    .select('account_role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error || !data) return null
  const role = data.account_role
  return role === 'traveller' || role === 'advisor' ? role : null
}

/**
 * Persists role for the signed-in user. Idempotent when role already matches.
 * Throws if user already has a different role.
 */
export async function setMyAccountRole(role: AccountRole): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('set_my_account_role', { p_role: role })
  if (error) {
    throw new Error(error.message)
  }
  clearAccountRoleIntent()
}

/** Apply session intent after sign-in if DB role not set yet. */
export async function applyAccountRoleIntentIfNeeded(): Promise<AccountRole | null> {
  const intent = readAccountRoleIntent()
  if (!intent) return fetchMyAccountRole()

  const existing = await fetchMyAccountRole()
  if (existing) {
    clearAccountRoleIntent()
    return existing
  }

  try {
    await setMyAccountRole(intent)
    return intent
  } catch {
    return fetchMyAccountRole()
  }
}

export function roleLabel(role: AccountRole): string {
  return role === 'advisor' ? 'Travel Advisor' : 'Traveller'
}
