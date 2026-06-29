import { FUNNEL_TOKEN_HEADER } from './funnelTokenShared'

/**
 * Client-side helper that lazily obtains a funnel token from /api/funnel-token
 * and caches it for the session. Used to attach the token to the anonymous
 * funnel LLM calls. Safe no-op when the server does not enforce tokens (it
 * returns an empty token, and we simply send no header).
 */

const STORAGE_KEY = 'tc_funnel_token'
let cached: string | null = null
let inflight: Promise<string | null> | null = null

export async function ensureFunnelToken(): Promise<string | null> {
  if (cached) return cached

  if (typeof window !== 'undefined') {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      cached = stored
      return cached
    }
  }

  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch('/api/funnel-token', { cache: 'no-store' })
      if (!res.ok) return null
      const data = (await res.json()) as { token?: string }
      const token = data.token?.trim() || null
      cached = token
      if (token && typeof window !== 'undefined') {
        window.sessionStorage.setItem(STORAGE_KEY, token)
      }
      return token
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Merge the funnel token header into a headers object (when a token is available). */
export async function withFunnelTokenHeader(
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  const token = await ensureFunnelToken()
  if (!token) return headers
  return { ...headers, [FUNNEL_TOKEN_HEADER]: token }
}
