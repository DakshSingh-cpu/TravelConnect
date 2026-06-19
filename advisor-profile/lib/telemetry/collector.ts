import {
  emptyTelemetry,
  TELEMETRY_STORAGE_KEY,
  RESIDENTIAL_ZIP_STORAGE_KEY,
  type DeviceClass,
  type FunnelStep,
  type SessionTelemetryPayload,
} from '@/lib/telemetry/types'

function detectDeviceClass(): DeviceClass {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

let state: SessionTelemetryPayload = emptyTelemetry()
let currentStep: FunnelStep | null = null
let stepEnteredAt: number | null = null
let lastKeydownAt: number | null = null
let turnIntervals: number[] = []
let lastUserMessageAt: number | null = null
let replyLatencies: number[] = []

function persist() {
  if (typeof window === 'undefined') return
  try {
    state.totalFunnelMs = Date.now() - state.funnelStartedAt
    sessionStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function initSessionTelemetry() {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(TELEMETRY_STORAGE_KEY)
    if (raw) {
      state = { ...emptyTelemetry(), ...JSON.parse(raw) }
    } else {
      state = emptyTelemetry()
      state.deviceClass = detectDeviceClass()
      state.funnelStartedAt = Date.now()
    }
  } catch {
    state = emptyTelemetry()
    state.deviceClass = detectDeviceClass()
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.deviceSignals.tabHiddenCount += 1
      persist()
    }
  })
}

export function enterFunnelStep(step: FunnelStep) {
  if (stepEnteredAt !== null && currentStep !== null) {
    const dwell = Date.now() - stepEnteredAt
    state.stepDwellMs[currentStep] = (state.stepDwellMs[currentStep] ?? 0) + dwell
  }
  currentStep = step
  stepEnteredAt = Date.now()
  persist()
}

export function recordConciergeUserTurn() {
  state.conciergeMetrics.userTurnCount += 1
  if (lastUserMessageAt !== null) {
    replyLatencies.push(Date.now() - lastUserMessageAt)
    state.conciergeMetrics.avgReplyLatencyMs =
      replyLatencies.reduce((a, b) => a + b, 0) / replyLatencies.length
  }
  lastUserMessageAt = Date.now()
  persist()
}

export function recordConciergeKeydown() {
  if (state.deviceClass === 'mobile') return
  const now = Date.now()
  if (lastKeydownAt !== null) {
    const delta = now - lastKeydownAt
    if (delta > 0 && delta < 30_000) {
      turnIntervals.push(delta)
      if (turnIntervals.length > 200) turnIntervals = turnIntervals.slice(-200)
    }
  }
  lastKeydownAt = now
}

export function recordConciergePaste() {
  state.conciergeMetrics.pasteDetected = true
  persist()
}

export function flushConciergeTurn() {
  const all = [...(state.conciergeMetrics.keystrokeIntervalsMs ?? []), ...turnIntervals]
  state.conciergeMetrics.keystrokeIntervalsMs = all.slice(-200)
  state.conciergeMetrics.hesitationPauseStdDevMs = stdDev(all)
  if (all.length > 0) {
    state.conciergeMetrics.hesitationPauseMeanMs =
      all.reduce((a, b) => a + b, 0) / all.length
  }
  turnIntervals = []
  lastKeydownAt = null
  persist()
}

export function readSessionTelemetry(): SessionTelemetryPayload {
  if (typeof window === 'undefined') return emptyTelemetry()
  try {
    const raw = sessionStorage.getItem(TELEMETRY_STORAGE_KEY)
    if (!raw) return state
    return JSON.parse(raw) as SessionTelemetryPayload
  } catch {
    return state
  }
}

export function persistResidentialZip(zip: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(RESIDENTIAL_ZIP_STORAGE_KEY, zip)
  } catch {
    /* ignore */
  }
}

export function readResidentialZip(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(RESIDENTIAL_ZIP_STORAGE_KEY)
  } catch {
    return null
  }
}
