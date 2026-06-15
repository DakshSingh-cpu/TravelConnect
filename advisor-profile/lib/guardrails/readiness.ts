import type { AdvisorBrief, ReadinessTier } from '@/lib/advisorBrief'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import {
  READINESS_TIER_THRESHOLDS,
} from '@/lib/guardrails/constants'

const BROAD_REGION_DESTINATIONS = new Set<string>([
  'Europe',
  'Southeast Asia',
  'Japan',
  'Maldives',
  'Africa Safari',
])

export function clampReadinessScore(score: number): number {
  if (!Number.isFinite(score)) return 50
  return Math.min(100, Math.max(0, Math.round(score)))
}

export function deriveReadinessTier(score: number): ReadinessTier {
  const s = clampReadinessScore(score)
  if (s >= READINESS_TIER_THRESHOLDS.hot) return 'hot'
  if (s >= READINESS_TIER_THRESHOLDS.warm) return 'warm'
  if (s >= READINESS_TIER_THRESHOLDS.nurture) return 'nurture'
  return 'blocked'
}

function isBroadRegionDestination(destination: string): boolean {
  const trimmed = destination.trim()
  if (!trimmed) return false
  return BROAD_REGION_DESTINATIONS.has(trimmed)
}

const PHONE_VERIFIED_CEILING_BOOST = 10

export function estimateReadinessCeiling(
  intake?: MatchIntakePayload | null,
  transcriptTurnCount?: number,
  phoneVerified?: boolean,
): number {
  let ceiling = 100

  if (transcriptTurnCount !== undefined && transcriptTurnCount < 2) {
    ceiling = Math.min(ceiling, 30)
  } else if (transcriptTurnCount !== undefined && transcriptTurnCount < 3) {
    ceiling = Math.min(ceiling, 38)
  }

  if (intake && isBroadRegionDestination(intake.destination)) {
    ceiling = Math.min(ceiling, 60)
  }

  if (!intake) {
    ceiling = Math.min(ceiling, 35)
  }

  if (phoneVerified) {
    ceiling = Math.min(100, ceiling + PHONE_VERIFIED_CEILING_BOOST)
  }

  return ceiling
}

export function normalizeAdvisorBrief(
  brief: AdvisorBrief,
  intake?: MatchIntakePayload | null,
  transcriptTurnCount?: number,
  phoneVerified?: boolean,
): AdvisorBrief {
  const ceiling = estimateReadinessCeiling(intake, transcriptTurnCount, phoneVerified)
  const clamped = Math.min(clampReadinessScore(brief.readiness_score), ceiling)
  const tier = deriveReadinessTier(clamped)

  return {
    ...brief,
    readiness_score: clamped,
    readiness_tier: tier,
    low_intent_signals: (brief.low_intent_signals ?? []).slice(0, 3),
  }
}

export const READINESS_BLOCKED_MESSAGE =
  'Based on your chat, we are not able to match you with an advisor yet. Share more about your trip — dates, must-see places, or group size — so we can find the right specialist for you.'

export function buildReadinessBlockedMatchResponse(
  readinessScore: number,
  readinessTier: ReadinessTier,
  lowIntentSignals: string[],
) {
  return {
    advisors: [] as [],
    blocked: true as const,
    code: 'READINESS_BLOCKED' as const,
    blockReason: READINESS_BLOCKED_MESSAGE,
    readinessTier,
    readinessScore,
    lowIntentSignals,
  }
}
