'use client'

import { useEffect } from 'react'
import { captureAttribution } from '@/lib/attribution'
import { persistAccountRoleIntent } from '@/lib/accountRole'
import { useSessionTelemetry } from '@/hooks/useSessionTelemetry'
import { enterFunnelStep } from '@/lib/telemetry/collector'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardPage() {
  useSessionTelemetry()

  useEffect(() => {
    captureAttribution()
    persistAccountRoleIntent('traveller')
    enterFunnelStep('onboard_destination')
  }, [])

  return <OnboardingWizard />
}
