import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { POST_LOGIN_PATH } from '@/lib/auth/constants'
import type { AccountRole } from '@/lib/accountRole'

function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

function roleFromParam(value: string | null): AccountRole | null {
  if (value === 'advisor' || value === 'traveller') return value
  return null
}

/**
 * OAuth callback: exchange the authorization code for a session, persist account
 * role when provided, then redirect to the intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = roleFromParam(searchParams.get('role'))
  const next = safeRedirectPath(searchParams.get('next'))
  const authError = searchParams.get('error_description') ?? searchParams.get('error')

  const fallbackLogin = role === 'advisor' ? '/advisor/login' : '/login'

  if (authError) {
    const url = new URL(fallbackLogin, origin)
    url.searchParams.set('error', authError)
    return NextResponse.redirect(url)
  }

  if (!code) {
    const url = new URL(fallbackLogin, origin)
    url.searchParams.set('error', 'Missing authorization code')
    return NextResponse.redirect(url)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const url = new URL(fallbackLogin, origin)
    url.searchParams.set('error', exchangeError.message)
    return NextResponse.redirect(url)
  }

  // Ensure public.users row exists before role assignment.
  await supabase.rpc('ensure_my_profile')

  if (role) {
    const { error: roleError } = await supabase.rpc('set_my_account_role', { p_role: role })
    if (roleError) {
      await supabase.auth.signOut()
      const url = new URL(fallbackLogin, origin)
      url.searchParams.set('error', roleError.message)
      return NextResponse.redirect(url)
    }
  }

  const destination = next ?? (role ? POST_LOGIN_PATH[role] : '/chat')
  return NextResponse.redirect(new URL(destination, origin))
}
