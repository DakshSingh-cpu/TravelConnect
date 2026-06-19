import { describe, it, expect } from 'vitest'
import { normalizeSeonResponse } from '@/lib/vetting/seon'

describe('normalizeSeonResponse', () => {
  it('maps fraud score and email domain type', () => {
    const result = normalizeSeonResponse({
      data: {
        fraud_score: 42,
        email_details: { domain_type: 'disposable' },
        phone_details: { risk_score: 25 },
        ip_details: { type: 'vpn', country: 'US' },
        social_media_profiles: [{}, {}],
        id: 'txn-abc',
      },
    })

    expect(result.fraudScore).toBe(42)
    expect(result.emailDomainType).toBe('disposable')
    expect(result.phoneRiskScore).toBe(25)
    expect(result.ipType).toBe('vpn')
    expect(result.ipCountry).toBe('US')
    expect(result.socialProfileCount).toBe(2)
    expect(result.rawTransactionId).toBe('txn-abc')
  })

  it('clamps fraud score to 0-100', () => {
    const high = normalizeSeonResponse({ fraud_score: 150 })
    expect(high.fraudScore).toBe(100)

    const low = normalizeSeonResponse({ score: -10 })
    expect(low.fraudScore).toBe(0)
  })

  it('detects corporate email domain', () => {
    const result = normalizeSeonResponse({
      email_details: { type: 'corporate' },
    })
    expect(result.emailDomainType).toBe('corporate')
  })
})
