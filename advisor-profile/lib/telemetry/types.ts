export type DeviceClass = 'desktop' | 'mobile' | 'tablet'

export type FunnelStep =
  | 'destination'
  | 'budget'
  | 'style'
  | 'chat'
  | 'matching'
  | 'results'
  | 'onboard_destination'
  | 'onboard_trip_vibe'
  | 'onboard_companions'
  | 'onboard_timing'
  | 'onboard_service_level'
  | 'onboard_service_fee'
  | 'onboard_priorities'
  | 'onboard_style_budget'
  | 'onboard_location'
  | 'onboard_details'
  | 'onboard_contact'
  | 'onboard_attribution'
  | 'onboard_complete'

export type ConciergeMetrics = {
  userTurnCount: number
  avgReplyLatencyMs: number
  pasteDetected: boolean
  keystrokeIntervalsMs: number[]
  hesitationPauseStdDevMs: number | null
  hesitationPauseMeanMs: number | null
}

export type SessionTelemetryPayload = {
  stepDwellMs: Partial<Record<FunnelStep, number>>
  totalFunnelMs: number
  deviceClass: DeviceClass
  conciergeMetrics: ConciergeMetrics
  deviceSignals: {
    tabHiddenCount: number
  }
  funnelStartedAt: number
}

export const TELEMETRY_STORAGE_KEY = 'tbo_session_telemetry'
export const RESIDENTIAL_ZIP_STORAGE_KEY = 'tbo_residential_zip'

export function emptyTelemetry(): SessionTelemetryPayload {
  return {
    stepDwellMs: {},
    totalFunnelMs: 0,
    deviceClass: 'desktop',
    conciergeMetrics: {
      userTurnCount: 0,
      avgReplyLatencyMs: 0,
      pasteDetected: false,
      keystrokeIntervalsMs: [],
      hesitationPauseStdDevMs: null,
      hesitationPauseMeanMs: null,
    },
    deviceSignals: { tabHiddenCount: 0 },
    funnelStartedAt: Date.now(),
  }
}
