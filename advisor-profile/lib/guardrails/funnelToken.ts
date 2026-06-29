import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { FUNNEL_TOKEN_HEADER } from './funnelTokenShared'

/**
 * Lightweight signed "proof of funnel entry" token.
 *
 * The public LLM endpoints (/api/chat, /api/synthesize-brief, /api/match-advisors)
 * are intentionally unauthenticated so the funnel can stay anonymous. To raise the
 * bar against direct, scripted abuse of those (cost-bearing) endpoints, the client
 * first fetches a short-lived HMAC token from /api/funnel-token (which is itself
 * rate-limited) and presents it on subsequent funnel calls.
 *
 * Enforcement is OPT-IN: it only activates when FUNNEL_TOKEN_SECRET is configured,
 * so local/dev/e2e and any environment without the secret behave exactly as before.
 */

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

function secret(): string | null {
  return process.env.FUNNEL_TOKEN_SECRET?.trim() || null
}

/** True when a secret is configured and tokens should be required. */
export function funnelTokenEnforced(): boolean {
  return secret() !== null
}

export function issueFunnelToken(now: number = Date.now()): string {
  const s = secret()
  if (!s) return ''
  const exp = now + DEFAULT_TTL_MS
  const sig = createHmac('sha256', s).update(String(exp)).digest('base64url')
  return `${exp}.${sig}`
}

export function verifyFunnelToken(token: string | null | undefined, now: number = Date.now()): boolean {
  const s = secret()
  if (!s) return true // not enforced
  if (!token) return false

  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expStr = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now) return false

  const expected = createHmac('sha256', s).update(expStr).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Returns true if the request carries a valid funnel token (or enforcement is off). */
export function verifyFunnelRequest(request: Request): boolean {
  if (!funnelTokenEnforced()) return true
  return verifyFunnelToken(request.headers.get(FUNNEL_TOKEN_HEADER))
}

export { FUNNEL_TOKEN_HEADER }
