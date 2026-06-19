import { describe, it, expect } from 'vitest'
import { validateTelemetry } from '@/lib/telemetry/validateTelemetry'

describe('validateTelemetry', () => {
  it('sanitizes negative dwell times and applies penalty', () => {
    const result = validateTelemetry({
      stepDwellMs: { destination: -100 },
      totalFunnelMs: 5000,
      deviceClass: 'desktop',
      conciergeMetrics: { userTurnCount: 2 },
    })
    expect(result.stepDwellMs.destination).toBeUndefined()
    expect(result.telemetryPenalty).toBe(true)
    expect(result.telemetryPenaltyReasons).toContain('NEGATIVE_DWELL')
  })

  it('caps excessive turn count', () => {
    const result = validateTelemetry({
      totalFunnelMs: 10_000,
      conciergeMetrics: { userTurnCount: 500 },
    })
    expect(result.conciergeMetrics.userTurnCount).toBe(100)
    expect(result.telemetryPenaltyReasons).toContain('EXCESSIVE_TURNS')
  })

  it('clears keystroke intervals on mobile', () => {
    const result = validateTelemetry({
      deviceClass: 'mobile',
      conciergeMetrics: {
        keystrokeIntervalsMs: [100, 200],
        hesitationPauseStdDevMs: 50,
      },
    })
    expect(result.conciergeMetrics.keystrokeIntervalsMs).toEqual([])
  })

  it('computes hesitation stddev from intervals when missing', () => {
    const result = validateTelemetry({
      deviceClass: 'desktop',
      conciergeMetrics: {
        keystrokeIntervalsMs: [100, 200, 150, 180],
      },
    })
    expect(result.conciergeMetrics.hesitationPauseStdDevMs).not.toBeNull()
    expect(result.conciergeMetrics.hesitationPauseStdDevMs!).toBeGreaterThan(0)
  })
})
