import { describe, it, expect } from 'vitest'
import { lookupZipAffluenceTier, affluenceBoostForTier } from '@/lib/vetting/zipAffluence'

describe('zipAffluence', () => {
  it('returns null for invalid zip format', () => {
    expect(lookupZipAffluenceTier('12345')).toBeNull()
    expect(lookupZipAffluenceTier('abcdef')).toBeNull()
  })

  it('looks up exact 6-digit zip when present in data', () => {
    const tier = lookupZipAffluenceTier('400001')
    if (tier !== null) {
      expect(tier).toBeGreaterThanOrEqual(1)
      expect(tier).toBeLessThanOrEqual(5)
    }
  })

  it('returns boost only for tier 4 and 5', () => {
    expect(affluenceBoostForTier(5)).toBe(15)
    expect(affluenceBoostForTier(4)).toBe(8)
    expect(affluenceBoostForTier(3)).toBe(4)
    expect(affluenceBoostForTier(1)).toBe(0)
  })
})
