import type { AgentProfile } from '@/lib/agencyDataProcessor'

/** Sidebar "On Platform" stat — years, since-year, or sub-year tenure. */
export function formatExperienceOnPlatform(profile: AgentProfile): string {
  if (profile.yearsAsVerifiedPartner >= 1) {
    const y = profile.yearsAsVerifiedPartner
    return y === 1 ? '1 Year' : `${y} Years`
  }
  if (profile.agencyCreatedYear) return `Since ${profile.agencyCreatedYear}`
  if (profile.daysSinceAgencyCreation >= 30) {
    const months = Math.floor(profile.daysSinceAgencyCreation / 30)
    return months >= 1 ? `${months} mo` : '< 1 Year'
  }
  return '< 1 Year'
}
