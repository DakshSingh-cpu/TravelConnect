import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { DEFAULT_READINESS_SCORE } from '@/lib/guardrails/constants'

/**
 * Binds a lead's readiness score to the server that computed it.
 *
 * /api/synthesize-brief is the only place readiness is scored (server-side, with
 * the real transcript and turn count). It signs the resulting (score, tier) here.
 * Downstream match endpoints (which are anonymous and accept a client-forwarded
 * brief) verify the signature instead of trusting the raw number, so a client
 * cannot POST an inflated readiness_score directly to /api/match-advisors,
 * /api/match-advisors/local, or /api/leads/request to bypass nurture/vetting.
 *
 * Enforcement is OPT-IN: it activates only when a secret is configured, so dev /
 * e2e / unconfigured environments behave exactly as before.
 */

function secret(): string | null {
  return (
    process.env.READINESS_SIGNING_SECRET?.trim() ||
    process.env.FUNNEL_TOKEN_SECRET?.trim() ||
    null
  )
}

export function readinessBindingEnforced(): boolean {
  return secret() !== null
}

function computeSignature(score: number, tier: string, s: string): string {
  return createHmac('sha256', s).update(`${score}.${tier}`).digest('base64url')
}

/** Returns a copy of the brief with a server signature attached (no-op if unconfigured). */
export function attachReadinessSignature(brief: AdvisorBrief): AdvisorBrief {
  const s = secret()
  if (!s) return brief
  return {
    ...brief,
    readiness_sig: computeSignature(brief.readiness_score, brief.readiness_tier, s),
  }
}

/** True if the brief carries a valid signature (or binding is not enforced). */
export function verifyReadinessSignature(brief: AdvisorBrief | null | undefined): boolean {
  const s = secret()
  if (!s) return true // not enforced
  if (!brief?.readiness_sig) return false

  const expected = computeSignature(brief.readiness_score, brief.readiness_tier, s)
  const a = Buffer.from(brief.readiness_sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Returns the brief unchanged when its readiness signature is valid (or binding
 * is disabled). When binding is enforced and the signature is missing/invalid,
 * caps readiness_score to the neutral default so a forged inflated score cannot
 * earn hot/warm treatment or skip nurture/vetting gates.
 */
export function enforceTrustedReadiness(brief: AdvisorBrief): AdvisorBrief {
  if (verifyReadinessSignature(brief)) return brief

  const cappedScore = Math.min(brief.readiness_score, DEFAULT_READINESS_SCORE)
  if (cappedScore !== brief.readiness_score) {
    console.warn('[readiness-binding] untrusted advisor brief — capping readiness score', {
      received: brief.readiness_score,
      capped: cappedScore,
    })
  }
  return { ...brief, readiness_score: cappedScore }
}
