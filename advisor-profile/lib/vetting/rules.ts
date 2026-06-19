import type { ValidatedTelemetry } from '@/lib/telemetry/validateTelemetry'
import type { SeonNormalizedResult } from '@/lib/vetting/seon'
import { affluenceBoostForTier, lookupZipAffluenceTier } from '@/lib/vetting/zipAffluence'

export type RuleOutcome = {
  scoreDelta: number
  hardBlock: boolean
  reasonCode?: string
  isBoostOnly?: boolean
}

export function evaluateReadinessGate(readinessTier: string | null): RuleOutcome {
  if (readinessTier === 'blocked') {
    return { scoreDelta: -100, hardBlock: true, reasonCode: 'READINESS_BLOCKED' }
  }
  return { scoreDelta: 0, hardBlock: false }
}

export function evaluateVelocityTrap(telemetry: ValidatedTelemetry): RuleOutcome {
  const dwells = Object.values(telemetry.stepDwellMs)
  const total = telemetry.totalFunnelMs
  if (total > 0 && total < 4000) {
    return { scoreDelta: -50, hardBlock: true, reasonCode: 'VELOCITY_TRAP_TOTAL' }
  }
  for (const d of dwells) {
    if (d < 1500) {
      return { scoreDelta: -40, hardBlock: true, reasonCode: 'VELOCITY_TRAP_STEP' }
    }
  }
  return { scoreDelta: 0, hardBlock: false }
}

export function evaluatePasteBot(telemetry: ValidatedTelemetry): RuleOutcome {
  if (telemetry.conciergeMetrics.pasteDetected && telemetry.totalFunnelMs < 60_000) {
    return { scoreDelta: -35, hardBlock: true, reasonCode: 'PASTE_BOT' }
  }
  return { scoreDelta: 0, hardBlock: false }
}

export function evaluateHesitationPauses(telemetry: ValidatedTelemetry): RuleOutcome {
  if (telemetry.deviceClass === 'mobile') {
    return { scoreDelta: 0, hardBlock: false }
  }
  const turns = telemetry.conciergeMetrics.userTurnCount
  const std = telemetry.conciergeMetrics.hesitationPauseStdDevMs
  if (turns < 2 || std === null) return { scoreDelta: 0, hardBlock: false }
  if (std < 20) {
    return { scoreDelta: -40, hardBlock: true, reasonCode: 'LOW_HESITATION_STDDEV' }
  }
  if (std < 40) {
    return { scoreDelta: -15, hardBlock: false, reasonCode: 'SUSPICIOUS_TYPING' }
  }
  return { scoreDelta: 5, hardBlock: false }
}

export function evaluateSeonIdentity(seon: SeonNormalizedResult | null): RuleOutcome {
  if (!seon) return { scoreDelta: 0, hardBlock: false }

  const threshold = Number(process.env.SEON_FRAUD_BLOCK_THRESHOLD ?? '70')
  if (seon.fraudScore >= threshold) {
    return { scoreDelta: -50, hardBlock: true, reasonCode: 'SEON_FRAUD_SCORE' }
  }

  if (seon.emailDomainType === 'disposable') {
    return { scoreDelta: -30, hardBlock: true, reasonCode: 'DISPOSABLE_EMAIL' }
  }

  if (seon.emailAgeDays !== null && seon.emailAgeDays < 7 && seon.socialProfileCount === 0) {
    return { scoreDelta: -25, hardBlock: false, reasonCode: 'YOUNG_EMAIL_NO_SOCIAL' }
  }

  if (seon.phoneRiskScore !== null && seon.phoneRiskScore >= 70) {
    return { scoreDelta: -30, hardBlock: true, reasonCode: 'HIGH_PHONE_RISK' }
  }

  if (seon.ipType === 'vpn' || seon.ipType === 'datacenter') {
    return { scoreDelta: -10, hardBlock: false, reasonCode: 'SUSPICIOUS_IP' }
  }

  if (seon.emailDomainType === 'corporate') {
    return { scoreDelta: 8, hardBlock: false, reasonCode: 'CORPORATE_EMAIL', isBoostOnly: true }
  }

  if (seon.socialProfileCount >= 2) {
    return { scoreDelta: 5, hardBlock: false, reasonCode: 'SOCIAL_PRESENCE', isBoostOnly: true }
  }

  return { scoreDelta: 0, hardBlock: false }
}

export function evaluateZipAffluence(residentialZip: string | null): RuleOutcome {
  if (!residentialZip) return { scoreDelta: 0, hardBlock: false }
  const tier = lookupZipAffluenceTier(residentialZip)
  if (!tier) return { scoreDelta: 0, hardBlock: false }
  return {
    scoreDelta: affluenceBoostForTier(tier),
    hardBlock: false,
    reasonCode: `ZIP_TIER_${tier}`,
    isBoostOnly: true,
  }
}

export function evaluateTelemetryPenalty(telemetry: ValidatedTelemetry): RuleOutcome {
  if (!telemetry.telemetryPenalty) return { scoreDelta: 0, hardBlock: false }
  return {
    scoreDelta: -20,
    hardBlock: false,
    reasonCode: 'TELEMETRY_SPOOF_PENALTY',
  }
}
