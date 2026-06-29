import 'server-only'
import { z } from 'zod'

/**
 * Startup environment validation.
 *
 * Required vars are hard-failed (the app cannot work without them). Production-
 * recommended vars are warned about (the app boots, but in a degraded/risky
 * state) so misconfiguration is visible at deploy time instead of surfacing as
 * cryptic runtime 500s deep inside a request.
 *
 * Invoked once from instrumentation.ts.
 */

const requiredSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
})

/** Vars that should be set in production; missing ones are warnings, not errors. */
const PRODUCTION_RECOMMENDED: Array<{ key: string; why: string }> = [
  { key: 'CRON_SECRET', why: 'cron routes return 500 without it' },
  { key: 'UPSTASH_REDIS_REST_URL', why: 'rate limiting fails closed (503) without it' },
  { key: 'UPSTASH_REDIS_REST_TOKEN', why: 'rate limiting fails closed (503) without it' },
  { key: 'GOOGLE_GENERATIVE_AI_API_KEY', why: 'concierge chat returns 503 without it' },
  { key: 'RESEND_API_KEY', why: 'transactional emails are skipped without it' },
  { key: 'FUNNEL_TOKEN_SECRET', why: 'funnel-token abuse protection is disabled without it' },
  { key: 'READINESS_SIGNING_SECRET', why: 'readiness anti-forgery binding is disabled without it' },
]

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const result = requiredSchema.safeParse(process.env)
  if (!result.success) {
    const messages = result.error.issues.map((i) => `  - ${i.message}`).join('\n')
    throw new Error(`[env] Missing/invalid required environment variables:\n${messages}`)
  }

  if (process.env.NODE_ENV === 'production') {
    const missing = PRODUCTION_RECOMMENDED.filter(({ key }) => !process.env[key]?.trim())
    for (const { key, why } of missing) {
      console.warn(`[env] WARNING: ${key} is not set in production — ${why}`)
    }
  }

  console.info('[env] environment validation passed')
}
