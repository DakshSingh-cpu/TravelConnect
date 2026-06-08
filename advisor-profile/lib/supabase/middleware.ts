import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import { LOGIN_PATH, POST_LOGIN_PATH } from '@/lib/auth/constants'
import type { AccountRole } from '@/lib/accountRole'

/** Routes that require authentication. */
const PROTECTED_PREFIXES = ['/chat', '/advisor/me'] as const

/** Auth pages — authenticated users are redirected away. */
const AUTH_PAGES: Record<AccountRole, string> = {
  advisor: '/advisor/login',
  traveller: '/login',
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function loginPathForProtectedRoute(pathname: string): string {
  if (pathname.startsWith('/advisor/me')) {
    return LOGIN_PATH.advisor
  }
  return LOGIN_PATH.traveller
}

function safeNextPath(pathname: string, search: string): string {
  const full = `${pathname}${search}`
  if (!full.startsWith('/') || full.startsWith('//')) return pathname
  return full
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  // Redirect signed-in users away from login screens.
  if (user) {
    const authPage = Object.values(AUTH_PAGES).find((path) => pathname === path)
    if (authPage) {
      const role: AccountRole = authPage === AUTH_PAGES.advisor ? 'advisor' : 'traveller'
      const next = request.nextUrl.searchParams.get('next')
      const destination =
        next?.startsWith('/') && !next.startsWith('//') ? next : POST_LOGIN_PATH[role]
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  // Protect chat and advisor self-service routes.
  if (!user && isProtectedPath(pathname)) {
    const loginPath = loginPathForProtectedRoute(pathname)
    const url = request.nextUrl.clone()
    url.pathname = loginPath
    url.searchParams.set('next', safeNextPath(pathname, search))
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
