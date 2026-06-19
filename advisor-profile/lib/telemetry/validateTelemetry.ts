import type { ConciergeMetrics, SessionTelemetryPayload } from '@/lib/telemetry/types'

const MAX_INTERVAL = 30_000
const MAX_TURNS = 100
const MAX_FUNNEL_MS = 3_600_000

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export type ValidatedTelemetry = SessionTelemetryPayload & {
  telemetryPenalty: boolean
  telemetryPenaltyReasons: string[]
}

export function validateTelemetry(raw: unknown): ValidatedTelemetry {
  const penaltyReasons: string[] = []
  const base =
    raw && typeof raw === 'object'
      ? (raw as Partial<SessionTelemetryPayload>)
      : {}

  const stepDwellMs: SessionTelemetryPayload['stepDwellMs'] = {}
  if (base.stepDwellMs && typeof base.stepDwellMs === 'object') {
    for (const [k, v] of Object.entries(base.stepDwellMs)) {
      if (typeof v === 'number' && v >= 0 && v <= MAX_FUNNEL_MS) {
        stepDwellMs[k as keyof typeof stepDwellMs] = v
      } else if (typeof v === 'number' && v < 0) {
        penaltyReasons.push('NEGATIVE_DWELL')
      }
    }
  }

  let totalFunnelMs =
    typeof base.totalFunnelMs === 'number' ? base.totalFunnelMs : 0
  if (totalFunnelMs < 0 || totalFunnelMs > MAX_FUNNEL_MS) {
    penaltyReasons.push('INVALID_FUNNEL_DURATION')
    totalFunnelMs = Math.min(Math.max(0, totalFunnelMs), MAX_FUNNEL_MS)
  }

  const deviceClass =
    base.deviceClass === 'mobile' || base.deviceClass === 'tablet'
      ? base.deviceClass
      : 'desktop'

  const cm: Partial<ConciergeMetrics> = base.conciergeMetrics ?? {}
  let userTurnCount =
    typeof cm.userTurnCount === 'number' ? Math.round(cm.userTurnCount) : 0
  if (userTurnCount > MAX_TURNS) {
    penaltyReasons.push('EXCESSIVE_TURNS')
    userTurnCount = MAX_TURNS
  }

  let keystrokeIntervalsMs = Array.isArray(cm.keystrokeIntervalsMs)
    ? cm.keystrokeIntervalsMs
        .filter((n): n is number => typeof n === 'number' && n >= 0 && n <= MAX_INTERVAL)
        .slice(-200)
    : []

  let hesitationPauseStdDevMs: number | null = null
  let hesitationPauseMeanMs: number | null = null

  if (deviceClass === 'mobile') {
    keystrokeIntervalsMs = []
  } else {
    hesitationPauseStdDevMs =
      typeof cm.hesitationPauseStdDevMs === 'number'
        ? cm.hesitationPauseStdDevMs
        : stdDev(keystrokeIntervalsMs)
    if (keystrokeIntervalsMs.length > 0) {
      hesitationPauseMeanMs =
        keystrokeIntervalsMs.reduce((a, b) => a + b, 0) / keystrokeIntervalsMs.length
    }
  }

  return {
    stepDwellMs,
    totalFunnelMs,
    deviceClass,
    conciergeMetrics: {
      userTurnCount,
      avgReplyLatencyMs:
        typeof cm.avgReplyLatencyMs === 'number' ? Math.max(0, cm.avgReplyLatencyMs) : 0,
      pasteDetected: Boolean(cm.pasteDetected),
      keystrokeIntervalsMs,
      hesitationPauseStdDevMs,
      hesitationPauseMeanMs,
    },
    deviceSignals: {
      tabHiddenCount:
        typeof base.deviceSignals?.tabHiddenCount === 'number'
          ? Math.max(0, base.deviceSignals.tabHiddenCount)
          : 0,
    },
    funnelStartedAt:
      typeof base.funnelStartedAt === 'number' ? base.funnelStartedAt : Date.now(),
    telemetryPenalty: penaltyReasons.length > 0,
    telemetryPenaltyReasons: penaltyReasons,
  }
}
