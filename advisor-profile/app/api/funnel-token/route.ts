import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { funnelTokenEnforced, issueFunnelToken } from '@/lib/guardrails/funnelToken'

/**
 * Issues a short-lived funnel token used to gate the anonymous LLM endpoints.
 * Rate-limited so it cannot be used as an unlimited token mint. Returns an empty
 * token when enforcement is disabled (no FUNNEL_TOKEN_SECRET configured).
 */
export async function GET(request: Request) {
  const rateLimited = await checkRateLimit(request, 'match-sessions', '/api/funnel-token')
  if (rateLimited) return rateLimited

  return NextResponse.json(
    { token: funnelTokenEnforced() ? issueFunnelToken() : '' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
