import type { ValidatedTelemetry } from '@/lib/telemetry/validateTelemetry'
import type { SeonNormalizedResult } from '@/lib/vetting/seon'
import {
  evaluateHesitationPauses,
  evaluatePasteBot,
  evaluateReadinessGate,
  evaluateSeonIdentity,
  evaluateTelemetryPenalty,
  evaluateVelocityTrap,
  evaluateZipAffluence,
  type RuleOutcome,
} from '@/lib/vetting/rules'

export type VettingDecision = 'pass' | 'block'

export type ScoreLeadInput = {
  telemetry: ValidatedTelemetry
  seon: SeonNormalizedResult | null
  readinessTier: string | null
  residentialZip: string | null
  advisorPrefAllowed: boolean
  advisorPrefReason?: string
}

export type ScoreLeadResult = {
  vettingScore: number
  decision: VettingDecision
  reasonCodes: string[]
}

const TELEMETRY_MAX_CONTRIBUTION = 40

export function scoreLead(input: ScoreLeadInput): ScoreLeadResult {
  const rules: RuleOutcome[] = [
    evaluateReadinessGate(input.readinessTier),
    evaluateVelocityTrap(input.telemetry),
    evaluatePasteBot(input.telemetry),
    evaluateHesitationPauses(input.telemetry),
    evaluateSeonIdentity(input.seon),
    evaluateZipAffluence(input.residentialZip),
    evaluateTelemetryPenalty(input.telemetry),
  ]

  if (!input.advisorPrefAllowed) {
    rules.push({
      scoreDelta: -30,
      hardBlock: true,
      reasonCode: input.advisorPrefReason ?? 'ADVISOR_PREF_MISMATCH',
    })
  }

  const reasonCodes: string[] = []
  let hardBlock = false
  let baseScore = 50
  let telemetryContribution = 0
  let hasNonBoostSignal = false

  for (const rule of rules) {
    if (rule.reasonCode) reasonCodes.push(rule.reasonCode)
    if (rule.hardBlock) hardBlock = true

    const isTelemetryRule =
      rule.reasonCode?.startsWith('VELOCITY') ||
      rule.reasonCode?.startsWith('PASTE') ||
      rule.reasonCode?.startsWith('LOW_HESITATION') ||
      rule.reasonCode?.startsWith('SUSPICIOUS_TYPING') ||
      rule.reasonCode === 'TELEMETRY_SPOOF_PENALTY'

    if (isTelemetryRule) {
      telemetryContribution += Math.abs(rule.scoreDelta)
    } else if (!rule.isBoostOnly && rule.scoreDelta !== 0) {
      hasNonBoostSignal = true
    }

    baseScore += rule.scoreDelta
  }

  if (telemetryContribution > TELEMETRY_MAX_CONTRIBUTION) {
    baseScore -= telemetryContribution - TELEMETRY_MAX_CONTRIBUTION
    reasonCodes.push('TELEMETRY_CAP_APPLIED')
  }

  const zipOnlyPass =
    reasonCodes.every((c) => c.startsWith('ZIP_TIER_') || c === 'TELEMETRY_CAP_APPLIED') &&
    !hasNonBoostSignal

  const threshold = Number(process.env.VETTING_PASS_THRESHOLD ?? '55')
  const score = Math.min(100, Math.max(0, Math.round(baseScore)))

  if (hardBlock || score < threshold || zipOnlyPass) {
    return { vettingScore: score, decision: 'block', reasonCodes }
  }

  return { vettingScore: score, decision: 'pass', reasonCodes }
}
