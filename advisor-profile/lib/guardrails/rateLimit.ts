import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitBucket = 'chat' | 'synthesize-brief' | 'match-advisors' | 'match-advisors-local' | 'match-sessions' | 'onboarding-submit' | 'leads-request' | 'leads-respond' | 'admin-override'

const BUCKET_LIMITS: Record<RateLimitBucket, { requests: number; window: `${number} s` | `${number} m` }> = {
  chat: { requests: 15, window: '1 m' },
  'synthesize-brief': { requests: 8, window: '1 m' },
  'match-advisors': { requests: 30, window: '1 m' },
  'match-advisors-local': { requests: 30, window: '1 m' },
  'match-sessions': { requests: 10, window: '1 m' },
  'onboarding-submit': { requests: 5, window: '1 m' },
  'leads-request': { requests: 10, window: '1 m' },
  'leads-respond': { requests: 20, window: '1 m' },
  'admin-override': { requests: 10, window: '1 m' },
}

let warnedMissingEnv = false
const limiters = new Map<RateLimitBucket, Ratelimit>()

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'anonymous'
}

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function getLimiter(bucket: RateLimitBucket): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production' && !warnedMissingEnv) {
      console.error('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — failing closed in production')
      warnedMissingEnv = true
    } else if (process.env.NODE_ENV !== 'production' && !warnedMissingEnv) {
      console.warn('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting disabled (non-production)')
      warnedMissingEnv = true
    }
    return null
  }

  const existing = limiters.get(bucket)
  if (existing) return existing

  const config = BUCKET_LIMITS[bucket]
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `tc-guardrails:${bucket}`,
    analytics: false,
  })
  limiters.set(bucket, limiter)
  return limiter
}

export function rateLimitJsonBody() {
  return {
    blocked: true as const,
    code: 'RATE_LIMITED' as const,
    message: 'Too many requests. Please wait a moment and try again.',
  }
}

function rateLimitUnavailableResponse(route: string, bucket: RateLimitBucket): NextResponse {
  console.error('[rate-limit] failing closed — limiter unavailable', { route, bucket })
  return NextResponse.json(
    {
      blocked: true as const,
      code: 'RATE_LIMIT_UNAVAILABLE' as const,
      message: 'Service temporarily unavailable. Please try again shortly.',
    },
    { status: 503, headers: { 'Retry-After': '30' } },
  )
}

export async function checkRateLimit(
  request: Request,
  bucket: RateLimitBucket,
  route: string,
): Promise<NextResponse | null> {
  const limiter = getLimiter(bucket)

  if (!limiter) {
    // Fail closed in production when Upstash is not configured; in non-production
    // rate limiting is simply disabled so local/dev work is unaffected.
    if (process.env.NODE_ENV === 'production' && !upstashConfigured()) {
      return rateLimitUnavailableResponse(route, bucket)
    }
    return null
  }

  const ip = getClientIp(request)

  let success: boolean
  let reset: number
  try {
    ;({ success, reset } = await limiter.limit(ip))
  } catch (err) {
    // Transient Redis/network error: stay available rather than taking down the
    // route, but record it so the outage is visible.
    console.error('[rate-limit] limiter error — allowing request', { route, bucket, err: String(err) })
    return null
  }

  if (success) return null

  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000))

  console.warn('[rate-limit]', { route, bucket })

  return NextResponse.json(rateLimitJsonBody(), {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSec) },
  })
}
