import type { MatchIntakePayload } from '@/lib/intakeValidation'
import type { OnboardingPayload } from './schema'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { buildFallbackBrief } from '@/lib/advisorBrief'
import { INTAKE_FIELD_DEFAULTS, MAX_BUDGET_LAKH } from '@/lib/guardrails/constants'

function deriveTravelStyle(payload: OnboardingPayload): string {
  const { companions, partySize } = payload
  if (companions === 'solo') return 'Solo'
  if (companions === 'partner' && partySize <= 2) return 'Couple'
  if (companions === 'kids') return 'Family'
  if (companions === 'friends' && partySize > 5) return 'Group'
  if (companions === 'friends') return 'Friends'
  return 'Couple'
}

function deriveTiming(payload: OnboardingPayload): string {
  if (payload.timingMode === 'dates' && payload.travelDates?.start) {
    const start = new Date(payload.travelDates.start)
    const now = new Date()
    const diffMonths =
      (start.getFullYear() - now.getFullYear()) * 12 + start.getMonth() - now.getMonth()
    if (diffMonths <= 3) return 'Next 3 months'
    if (diffMonths <= 6) return 'Next 6 months'
    return 'Next 6 months'
  }
  if (payload.flexibleMonths && payload.flexibleMonths.length > 0) {
    return 'Next 6 months'
  }
  return INTAKE_FIELD_DEFAULTS.timing
}

function deriveDuration(payload: OnboardingPayload): string {
  switch (payload.lengthOfStay) {
    case '<5_days':
      return '< 5 days'
    case '1_2_weeks':
      return '1-2 weeks'
    case '2_plus_weeks':
      return '2+ weeks'
    default:
      return INTAKE_FIELD_DEFAULTS.duration
  }
}

const TRIP_VIBE_MAP: Record<string, string> = {
  scenic_nature: 'Nature',
  somewhere_warm: 'Beach',
  city_culture: 'Culture',
  beach_islands: 'Beach',
  mountains: 'Adventure',
  coastal_escape: 'Relaxation',
  surprise_me: 'Culture',
}

function deriveVibe(payload: OnboardingPayload): string {
  if (payload.tripVibe && TRIP_VIBE_MAP[payload.tripVibe]) {
    return TRIP_VIBE_MAP[payload.tripVibe]
  }
  if (payload.priorities?.includes('honeymoon')) return 'Celebration'
  if (payload.priorities?.includes('adventure') || payload.priorities?.includes('safari'))
    return 'Adventure'
  if (payload.priorities?.includes('wellness')) return 'Relaxation'
  return INTAKE_FIELD_DEFAULTS.vibe
}

/**
 * Budget: the wizard now captures total trip budget in INR.
 * Convert directly to lakh. Falls back to 15L when not provided.
 */
function deriveBudgetLakh(payload: OnboardingPayload): number {
  const totalBudgetInr = payload.nightlySpend ?? 15_00_000 // default ₹15L
  const budgetLakh = Math.round((totalBudgetInr / 1_00_000) * 2) / 2 // round to nearest 0.5L
  return Math.min(MAX_BUDGET_LAKH, Math.max(0.5, budgetLakh))
}

export function mapToMatchIntake(payload: OnboardingPayload): MatchIntakePayload {
  return {
    destination: payload.destination,
    budgetLakh: deriveBudgetLakh(payload),
    travelStyle: deriveTravelStyle(payload),
    vibe: deriveVibe(payload),
    pace: INTAKE_FIELD_DEFAULTS.pace,
    timing: deriveTiming(payload),
    duration: deriveDuration(payload),
  }
}

export function buildSyntheticBrief(payload: OnboardingPayload): AdvisorBrief {
  const intake = mapToMatchIntake(payload)
  const notes = [
    payload.additionalDetails,
    payload.priorities?.length ? `Priorities: ${payload.priorities.join(', ')}` : null,
    payload.travelStyle ? `Style preference: ${payload.travelStyle}` : null,
  ]
    .filter(Boolean)
    .join('. ')

  return buildFallbackBrief(intake, notes || undefined)
}
