import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { AdvisorBrief } from '@/lib/advisorBrief'

const ORIGINAL_R = process.env.READINESS_SIGNING_SECRET
const ORIGINAL_F = process.env.FUNNEL_TOKEN_SECRET

function brief(score: number, tier: AdvisorBrief['readiness_tier'] = 'hot'): AdvisorBrief {
  return {
    tldr: 'x',
    hard_constraints: { budget: '10', dates: 'soon', pax: null },
    key_decisions: [],
    advisor_action_items: [],
    readiness_score: score,
    readiness_tier: tier,
    low_intent_signals: [],
  }
}

async function mod() {
  return await import('@/lib/vetting/readinessSignature')
}

describe('readinessSignature', () => {
  beforeEach(() => {
    delete process.env.READINESS_SIGNING_SECRET
    delete process.env.FUNNEL_TOKEN_SECRET
  })
  afterEach(() => {
    process.env.READINESS_SIGNING_SECRET = ORIGINAL_R
    process.env.FUNNEL_TOKEN_SECRET = ORIGINAL_F
    if (ORIGINAL_R === undefined) delete process.env.READINESS_SIGNING_SECRET
    if (ORIGINAL_F === undefined) delete process.env.FUNNEL_TOKEN_SECRET
  })

  it('is not enforced without a secret and trusts everything', async () => {
    const { readinessBindingEnforced, verifyReadinessSignature, enforceTrustedReadiness } = await mod()
    expect(readinessBindingEnforced()).toBe(false)
    expect(verifyReadinessSignature(brief(95))).toBe(true)
    expect(enforceTrustedReadiness(brief(95)).readiness_score).toBe(95)
  })

  it('signs and verifies a brief when a secret is set', async () => {
    process.env.READINESS_SIGNING_SECRET = 'sign-secret'
    const { attachReadinessSignature, verifyReadinessSignature } = await mod()
    const signed = attachReadinessSignature(brief(80))
    expect(signed.readiness_sig).toBeTruthy()
    expect(verifyReadinessSignature(signed)).toBe(true)
  })

  it('caps an unsigned/forged inflated score to the default', async () => {
    process.env.READINESS_SIGNING_SECRET = 'sign-secret'
    const { enforceTrustedReadiness } = await mod()
    // Forged: high score, no signature.
    expect(enforceTrustedReadiness(brief(95)).readiness_score).toBe(50)
  })

  it('detects a score tampered after signing', async () => {
    process.env.READINESS_SIGNING_SECRET = 'sign-secret'
    const { attachReadinessSignature, verifyReadinessSignature, enforceTrustedReadiness } = await mod()
    const signed = attachReadinessSignature(brief(50, 'nurture'))
    const tampered = { ...signed, readiness_score: 95 }
    expect(verifyReadinessSignature(tampered)).toBe(false)
    expect(enforceTrustedReadiness(tampered).readiness_score).toBe(50)
  })

  it('falls back to FUNNEL_TOKEN_SECRET when READINESS_SIGNING_SECRET is unset', async () => {
    process.env.FUNNEL_TOKEN_SECRET = 'funnel-secret'
    const { readinessBindingEnforced, attachReadinessSignature, verifyReadinessSignature } = await mod()
    expect(readinessBindingEnforced()).toBe(true)
    const signed = attachReadinessSignature(brief(70, 'warm'))
    expect(verifyReadinessSignature(signed)).toBe(true)
  })
})
