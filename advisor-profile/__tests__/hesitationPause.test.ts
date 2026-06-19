import { describe, it, expect } from 'vitest'
import { evaluateHesitationPauses } from '@/lib/vetting/rules'
import type { ValidatedTelemetry } from '@/lib/telemetry/validateTelemetry'

function telemetry(
  overrides: Partial<ValidatedTelemetry['conciergeMetrics']> & {
    deviceClass?: ValidatedTelemetry['deviceClass']
  } = {},
): ValidatedTelemetry {
  const { deviceClass = 'desktop', ...cm } = overrides
  return {
    stepDwellMs: {},
    totalFunnelMs: 60_000,
    deviceClass,
    conciergeMetrics: {
      userTurnCount: cm.userTurnCount ?? 3,
      avgReplyLatencyMs: 0,
      pasteDetected: false,
      keystrokeIntervalsMs: [],
      hesitationPauseStdDevMs: cm.hesitationPauseStdDevMs ?? 50,
      hesitationPauseMeanMs: null,
    },
    deviceSignals: { tabHiddenCount: 0 },
    funnelStartedAt: Date.now(),
    telemetryPenalty: false,
    telemetryPenaltyReasons: [],
  }
}

describe('evaluateHesitationPauses', () => {
  it('hard blocks very low stddev on desktop with enough turns', () => {
    const outcome = evaluateHesitationPauses(
      telemetry({ hesitationPauseStdDevMs: 15, userTurnCount: 3 }),
    )
    expect(outcome.hardBlock).toBe(true)
    expect(outcome.reasonCode).toBe('LOW_HESITATION_STDDEV')
  })

  it('applies soft penalty for suspicious typing', () => {
    const outcome = evaluateHesitationPauses(
      telemetry({ hesitationPauseStdDevMs: 30, userTurnCount: 3 }),
    )
    expect(outcome.hardBlock).toBe(false)
    expect(outcome.reasonCode).toBe('SUSPICIOUS_TYPING')
    expect(outcome.scoreDelta).toBeLessThan(0)
  })

  it('skips on mobile', () => {
    const outcome = evaluateHesitationPauses(
      telemetry({ deviceClass: 'mobile', hesitationPauseStdDevMs: 5, userTurnCount: 5 }),
    )
    expect(outcome.scoreDelta).toBe(0)
    expect(outcome.hardBlock).toBe(false)
  })
})
