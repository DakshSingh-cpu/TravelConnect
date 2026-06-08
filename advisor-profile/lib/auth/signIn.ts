'use client'

import { createClient } from '@/lib/supabase/client'
import type { AccountRole } from '@/lib/accountRole'
import { persistAccountRoleIntent, setMyAccountRole } from '@/lib/accountRole'
import { formatAuthError } from '@/lib/auth/constants'
import { completeSignIn } from '@/lib/auth/postLogin'

type SignInWithEmailParams = {
  email: string
  password: string
  accountRole: AccountRole
  mode: 'sign_in' | 'sign_up'
  fullName?: string
}

type SignInWithEmailResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; error: string }

/** Build OAuth callback URL with role and optional post-login redirect. */
export function buildOAuthCallbackUrl(accountRole: AccountRole, nextPath?: string | null): string {
  const url = new URL('/auth/callback', window.location.origin)
  url.searchParams.set('role', accountRole)
  if (nextPath?.startsWith('/')) {
    url.searchParams.set('next', nextPath)
  }
  return url.toString()
}

/** Google OAuth — redirects away from the page on success. */
export async function signInWithGoogle(
  accountRole: AccountRole,
  nextPath?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  persistAccountRoleIntent(accountRole)

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: buildOAuthCallbackUrl(accountRole, nextPath),
    },
  })

  if (error) {
    return { ok: false, error: formatAuthError(error.message) }
  }

  return { ok: true }
}

/** Email/password sign-in or sign-up (client-side). */
export async function signInWithEmail(
  params: SignInWithEmailParams,
): Promise<SignInWithEmailResult> {
  const { email, password, accountRole, mode, fullName } = params
  persistAccountRoleIntent(accountRole)

  const supabase = createClient()

  try {
    if (mode === 'sign_up') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName?.trim() || undefined },
        },
      })
      if (error) throw error

      try {
        await setMyAccountRoleSafe(accountRole)
      } catch {
        /* role may be set after email confirmation on first sign-in */
      }

      return { ok: true, needsEmailConfirmation: true }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    await completeSignIn(accountRole)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed'
    return { ok: false, error: formatAuthError(message) }
  }
}

async function setMyAccountRoleSafe(role: AccountRole): Promise<void> {
  await setMyAccountRole(role)
}
