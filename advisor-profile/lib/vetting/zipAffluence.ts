import tiers from '@/data/zip-affluence-tiers.json'

export type AffluenceTier = 1 | 2 | 3 | 4 | 5

const tierMap = tiers as Record<string, number>

export function lookupZipAffluenceTier(
  zip: string,
  _countryCode = 'IN',
): AffluenceTier | null {
  const trimmed = zip.trim()
  if (!/^\d{6}$/.test(trimmed)) return null

  if (tierMap[trimmed]) {
    const t = tierMap[trimmed]
    if (t >= 1 && t <= 5) return t as AffluenceTier
  }

  const prefix3 = trimmed.slice(0, 3)
  if (tierMap[prefix3]) {
    const t = tierMap[prefix3]
    if (t >= 1 && t <= 5) return t as AffluenceTier
  }

  return null
}

export function affluenceBoostForTier(tier: AffluenceTier): number {
  if (tier === 5) return 15
  if (tier === 4) return 8
  if (tier === 3) return 4
  return 0
}
