import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import { LOGIN_PATH, POST_LOGIN_PATH } from '@/lib/auth/constants'
import type { AccountRole } from '@/lib/accountRole'

/** Routes that require authentication. */
const PROTECTED_PREFIXES = ['/chat', '/advisor/me', '/admin'] as const

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

const REQUEST_ID_HEADER = 'x-request-id'

export async function updateSession(request: NextRequest) {
  // Correlation id: reuse an inbound id (e.g. from an edge/CDN) or mint one, and
  // propagate it so logs across a single request can be tied together.
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID()
  request.headers.set(REQUEST_ID_HEADER, requestId)

  let supabaseResponse = NextResponse.next({ request })
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId)

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
      const redirectResponse = NextResponse.redirect(new URL(destination, request.url))
      redirectResponse.headers.set(REQUEST_ID_HEADER, requestId)
      return redirectResponse
    }
  }

  // Protect chat and advisor self-service routes.
  if (!user && isProtectedPath(pathname)) {
    const loginPath = loginPathForProtectedRoute(pathname)
    const url = request.nextUrl.clone()
    url.pathname = loginPath
    url.searchParams.set('next', safeNextPath(pathname, search))
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set(REQUEST_ID_HEADER, requestId)
    return redirectResponse
  }

  // Re-apply on the (possibly cookie-rebuilt) response before returning.
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId)
  return supabaseResponse
}
