'use client'

import { useEffect } from 'react'
import { initSessionTelemetry } from '@/lib/telemetry/collector'

/** Call once at the root of the traveller funnel to start passive telemetry collection. */
export function useSessionTelemetry() {
  useEffect(() => {
    initSessionTelemetry()
  }, [])
}
