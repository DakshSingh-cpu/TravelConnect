import { describe, it, expect } from 'vitest'
import { advisorBriefSchema, buildFallbackBrief } from '@/lib/advisorBrief'
import { INTAKE_FIELD_DEFAULTS } from '@/lib/guardrails/constants'
import {
  buildReadinessBlockedMatchResponse,
  clampReadinessScore,
  deriveReadinessTier,
  estimateReadinessCeiling,
  normalizeAdvisorBrief,
} from '@/lib/guardrails/readiness'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'

const intake: MatchIntakePayload = {
  destination: 'Japan',
  budgetLakh: 10,
  travelStyle: 'Couple',
  ...INTAKE_FIELD_DEFAULTS,
}

function baseBrief(overrides: Partial<ReturnType<typeof buildFallbackBrief>> = {}) {
  return { ...buildFallbackBrief(intake), ...overrides }
}

describe('deriveReadinessTier', () => {
  it('returns hot for score 80', () => {
    expect(deriveReadinessTier(80)).toBe('hot')
  })

  it('returns nurture for score 50', () => {
    expect(deriveReadinessTier(50)).toBe('nurture')
  })

  it('returns nurture for score 42', () => {
    expect(deriveReadinessTier(42)).toBe('nurture')
  })

  it('returns blocked for score 41', () => {
    expect(deriveReadinessTier(41)).toBe('blocked')
  })

  it('returns blocked for score 20', () => {
    expect(deriveReadinessTier(20)).toBe('blocked')
  })
})

describe('clampReadinessScore', () => {
  it('clamps out of range values', () => {
    expect(clampReadinessScore(150)).toBe(100)
    expect(clampReadinessScore(-5)).toBe(0)
  })
})

describe('normalizeAdvisorBrief', () => {
  it('recalculates tier when LLM tier disagrees with score', () => {
    const normalized = normalizeAdvisorBrief(
      baseBrief({ readiness_score: 80, readiness_tier: 'warm' }),
      { ...intake, destination: 'Tokyo' },
      5,
    )
    expect(normalized.readiness_tier).toBe('hot')
    expect(normalized.readiness_score).toBe(80)
  })

  it('caps inflated score for broad destination with few turns', () => {
    const normalized = normalizeAdvisorBrief(
      baseBrief({ readiness_score: 95, readiness_tier: 'hot' }),
      { ...intake, destination: 'Europe' },
      1,
    )
    expect(normalized.readiness_score).toBeLessThanOrEqual(30)
    expect(normalized.readiness_tier).toBe('blocked')
  })

  it('produces valid nurture defaults from buildFallbackBrief with broad destination', () => {
    const normalized = normalizeAdvisorBrief(buildFallbackBrief(intake), intake, 4)
    expect(normalized.readiness_score).toBe(50)
    expect(normalized.readiness_tier).toBe('nurture')
  })

  it('produces valid warm defaults from buildFallbackBrief with specific destination', () => {
    const specificIntake = { ...intake, destination: 'Tokyo' }
    const normalized = normalizeAdvisorBrief(buildFallbackBrief(specificIntake), specificIntake, 4)
    expect(normalized.readiness_score).toBe(50)
    expect(normalized.readiness_tier).toBe('nurture')
  })
})

describe('estimateReadinessCeiling', () => {
  it('lowers ceiling without intake', () => {
    expect(estimateReadinessCeiling(null, 5)).toBeLessThanOrEqual(35)
  })

  it('aggressively caps ceiling for very few turns', () => {
    expect(estimateReadinessCeiling(intake, 1)).toBeLessThanOrEqual(30)
  })

  it('caps ceiling for 2 turns', () => {
    expect(estimateReadinessCeiling(intake, 2)).toBeLessThanOrEqual(38)
  })

  it('allows full ceiling for adequate conversation', () => {
    const specificIntake = { ...intake, destination: 'Tokyo' }
    expect(estimateReadinessCeiling(specificIntake, 5)).toBe(100)
  })
})

describe('advisorBriefSchema coercion', () => {
  it('coerces string readiness_score', () => {
    const parsed = advisorBriefSchema.parse({
      ...buildFallbackBrief(intake),
      readiness_score: '85',
      readiness_tier: 'hot',
    })
    expect(parsed.readiness_score).toBe(85)
  })
})

describe('buildReadinessBlockedMatchResponse', () => {
  it('returns blocked match shape', () => {
    const body = buildReadinessBlockedMatchResponse(20, 'blocked', ['vague dates'])
    expect(body.blocked).toBe(true)
    expect(body.code).toBe('READINESS_BLOCKED')
    expect(body.advisors).toEqual([])
    expect(body.lowIntentSignals).toEqual(['vague dates'])
  })
})
