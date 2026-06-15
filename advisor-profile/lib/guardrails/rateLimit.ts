import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitBucket = 'chat' | 'synthesize-brief' | 'match-advisors' | 'match-sessions'

const BUCKET_LIMITS: Record<RateLimitBucket, { requests: number; window: `${number} s` | `${number} m` }> = {
  chat: { requests: 15, window: '1 m' },
  'synthesize-brief': { requests: 8, window: '1 m' },
  'match-advisors': { requests: 30, window: '1 m' },
  'match-sessions': { requests: 10, window: '1 m' },
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

function getLimiter(bucket: RateLimitBucket): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production' && !warnedMissingEnv) {
      console.warn('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting disabled')
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

export async function checkRateLimit(
  request: Request,
  bucket: RateLimitBucket,
  route: string,
): Promise<NextResponse | null> {
  const limiter = getLimiter(bucket)
  if (!limiter) return null

  const ip = getClientIp(request)
  const { success, reset } = await limiter.limit(ip)

  if (success) return null

  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000))

  console.warn('[rate-limit]', { route, bucket })

  return NextResponse.json(rateLimitJsonBody(), {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSec) },
  })
}
