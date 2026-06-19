import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { scoreLead } from '@/lib/vetting/scoreLead'
import type { ValidatedTelemetry } from '@/lib/telemetry/validateTelemetry'
import type { SeonNormalizedResult } from '@/lib/vetting/seon'

function baseTelemetry(overrides: Partial<ValidatedTelemetry> = {}): ValidatedTelemetry {
  return {
    stepDwellMs: { destination: 8000, budget: 8000, chat: 15000 },
    totalFunnelMs: 120_000,
    deviceClass: 'desktop',
    conciergeMetrics: {
      userTurnCount: 4,
      avgReplyLatencyMs: 2500,
      pasteDetected: false,
      keystrokeIntervalsMs: [120, 180, 90, 200, 150],
      hesitationPauseStdDevMs: 55,
      hesitationPauseMeanMs: 148,
    },
    deviceSignals: { tabHiddenCount: 0 },
    funnelStartedAt: Date.now() - 120_000,
    telemetryPenalty: false,
    telemetryPenaltyReasons: [],
    ...overrides,
  }
}

function baseSeon(overrides: Partial<SeonNormalizedResult> = {}): SeonNormalizedResult {
  return {
    fraudScore: 20,
    emailAgeDays: 365,
    emailDomainType: 'free',
    phoneRiskScore: 10,
    socialProfileCount: 1,
    ipCountry: 'IN',
    ipType: 'residential',
    rawTransactionId: 'tx-1',
    fromCache: false,
    ...overrides,
  }
}

describe('scoreLead', () => {
  const originalThreshold = process.env.VETTING_PASS_THRESHOLD

  beforeEach(() => {
    process.env.VETTING_PASS_THRESHOLD = '55'
    process.env.SEON_FRAUD_BLOCK_THRESHOLD = '70'
  })

  afterEach(() => {
    if (originalThreshold === undefined) delete process.env.VETTING_PASS_THRESHOLD
    else process.env.VETTING_PASS_THRESHOLD = originalThreshold
  })

  it('passes a healthy lead with SEON and telemetry signals', () => {
    const result = scoreLead({
      telemetry: baseTelemetry(),
      seon: baseSeon(),
      readinessTier: 'ready',
      residentialZip: null,
      advisorPrefAllowed: true,
    })
    expect(result.decision).toBe('pass')
    expect(result.vettingScore).toBeGreaterThanOrEqual(55)
  })

  it('blocks on velocity trap (total funnel < 4s)', () => {
    const result = scoreLead({
      telemetry: baseTelemetry({ totalFunnelMs: 3000 }),
      seon: baseSeon(),
      readinessTier: 'ready',
      residentialZip: null,
      advisorPrefAllowed: true,
    })
    expect(result.decision).toBe('block')
    expect(result.reasonCodes).toContain('VELOCITY_TRAP_TOTAL')
  })

  it('blocks on paste bot pattern', () => {
    const result = scoreLead({
      telemetry: baseTelemetry({
        conciergeMetrics: {
          ...baseTelemetry().conciergeMetrics,
          pasteDetected: true,
        },
        totalFunnelMs: 30_000,
      }),
      seon: baseSeon(),
      readinessTier: 'ready',
      residentialZip: null,
      advisorPrefAllowed: true,
    })
    expect(result.decision).toBe('block')
    expect(result.reasonCodes).toContain('PASTE_BOT')
  })

  it('blocks on low hesitation stddev on desktop', () => {
    const result = scoreLead({
      telemetry: baseTelemetry({
        conciergeMetrics: {
          ...baseTelemetry().conciergeMetrics,
          hesitationPauseStdDevMs: 15,
          userTurnCount: 4,
        },
      }),
      seon: baseSeon(),
      readinessTier: 'ready',
      residentialZip: null,
      advisorPrefAllowed: true,
    })
    expect(result.decision).toBe('block')
    expect(result.reasonCodes).toContain('LOW_HESITATION_STDDEV')
  })

  it('ignores hesitation rule on mobile', () => {
    const result = scoreLead({
      telemetry: baseTelemetry({
        deviceClass: 'mobile',
        conciergeMetrics: {
          ...baseTelemetry().conciergeMetrics,
          hesitationPauseStdDevMs: 10,
        },
      }),
      seon: baseSeon(),
      readinessTier: 'ready',
      residentialZip: null,
      advisorPrefAllowed: true,
    })
    expect(result.reasonCodes).not.toContain('LOW_HESITATION_STDDEV')
  })

  it('blocks readiness tier blocked', () => {
    const result = scoreLead({
      telemetry: baseTelemetry(),
      seon: baseSeon(),
      readinessTier: 'blocked',
      residentialZip: null,
      advisorPrefAllowed: true,
    })
    expect(result.decision).toBe('block')
    expect(result.reasonCodes).toContain('READINESS_BLOCKED')
  })

  it('blocks zip-only pass (boost cannot be sole signal)', () => {
    const result = scoreLead({
      telemetry: baseTelemetry({
        stepDwellMs: {},
        totalFunnelMs: 0,
        conciergeMetrics: {
          userTurnCount: 0,
          avgReplyLatencyMs: 0,
          pasteDetected: false,
          keystrokeIntervalsMs: [],
          hesitationPauseStdDevMs: null,
          hesitationPauseMeanMs: null,
        },
      }),
      seon: null,
      readinessTier: 'ready',
      residentialZip: '110001',
      advisorPrefAllowed: true,
    })
    expect(result.decision).toBe('block')
  })

  it('blocks high SEON fraud score', () => {
    const result = scoreLead({
      telemetry: baseTelemetry(),
      seon: baseSeon({ fraudScore: 85 }),
      readinessTier: 'ready',
      residentialZip: null,
      advisorPrefAllowed: true,
    })
    expect(result.decision).toBe('block')
    expect(result.reasonCodes).toContain('SEON_FRAUD_SCORE')
  })

  it('blocks advisor preference mismatch', () => {
    const result = scoreLead({
      telemetry: baseTelemetry(),
      seon: baseSeon(),
      readinessTier: 'ready',
      residentialZip: null,
      advisorPrefAllowed: false,
      advisorPrefReason: 'BUDGET_TOO_LOW',
    })
    expect(result.decision).toBe('block')
    expect(result.reasonCodes).toContain('BUDGET_TOO_LOW')
  })
})
