import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const ORIGINAL = process.env.FUNNEL_TOKEN_SECRET

async function freshModule() {
  // Re-import so the module reads the current env at call time.
  return await import('@/lib/guardrails/funnelToken')
}

describe('funnelToken', () => {
  beforeEach(() => {
    delete process.env.FUNNEL_TOKEN_SECRET
  })
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.FUNNEL_TOKEN_SECRET
    else process.env.FUNNEL_TOKEN_SECRET = ORIGINAL
  })

  it('is not enforced and verifies everything when no secret is set', async () => {
    const { funnelTokenEnforced, verifyFunnelToken, issueFunnelToken } = await freshModule()
    expect(funnelTokenEnforced()).toBe(false)
    expect(issueFunnelToken()).toBe('')
    expect(verifyFunnelToken(null)).toBe(true)
    expect(verifyFunnelToken('anything')).toBe(true)
  })

  it('issues and verifies a valid token when a secret is set', async () => {
    process.env.FUNNEL_TOKEN_SECRET = 'test-secret'
    const { funnelTokenEnforced, issueFunnelToken, verifyFunnelToken } = await freshModule()
    expect(funnelTokenEnforced()).toBe(true)
    const token = issueFunnelToken()
    expect(token).toMatch(/^\d+\./)
    expect(verifyFunnelToken(token)).toBe(true)
  })

  it('rejects missing, tampered, and expired tokens', async () => {
    process.env.FUNNEL_TOKEN_SECRET = 'test-secret'
    const { issueFunnelToken, verifyFunnelToken } = await freshModule()

    expect(verifyFunnelToken(null)).toBe(false)
    expect(verifyFunnelToken('')).toBe(false)
    expect(verifyFunnelToken('no-dot')).toBe(false)

    const token = issueFunnelToken()
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa')
    expect(verifyFunnelToken(tampered)).toBe(false)

    // Expired (issued 3 hours ago, TTL is 2h)
    const expired = issueFunnelToken(Date.now() - 3 * 60 * 60 * 1000)
    expect(verifyFunnelToken(expired)).toBe(false)
  })

  it('rejects a token signed with a different secret', async () => {
    process.env.FUNNEL_TOKEN_SECRET = 'secret-a'
    const a = await freshModule()
    const token = a.issueFunnelToken()

    process.env.FUNNEL_TOKEN_SECRET = 'secret-b'
    const b = await freshModule()
    expect(b.verifyFunnelToken(token)).toBe(false)
  })
})
