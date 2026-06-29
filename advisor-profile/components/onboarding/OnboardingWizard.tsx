'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOnboardingState } from '@/lib/onboarding/useOnboardingState'
import { STEPS, TOTAL_WIZARD_STEPS } from '@/lib/onboarding/steps'
import type { OnboardingPayload } from '@/lib/onboarding/schema'
import { onboardingPayloadSchema, priorityOptions } from '@/lib/onboarding/schema'
import { useRouter } from 'next/navigation'
import { mapToMatchIntake, buildSyntheticBrief } from '@/lib/onboarding/mapToMatchIntake'
import { VIBE_IMAGES, SERVICE_LEVEL_IMAGES, PRIORITY_IMAGES, DESTINATION_IMAGES, COMPANION_IMAGES } from '@/lib/onboarding/images'
import { persistOnboardingContext } from '@/lib/conciergePrompt'
import { markConciergeResumePending, persistConciergeHandoff } from '@/lib/onboarding/resumeConcierge'
import { readAttribution } from '@/lib/attribution'
import { persistMatchSession, persistMatchSessionId } from '@/lib/matchSession'
import { persistAdvisorBrief } from '@/lib/advisorBrief'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import type { AdvisorBrief } from '@/lib/advisorBrief'

import OnboardingShell from './OnboardingShell'
import OnboardingImagePanel from './OnboardingImagePanel'
import OnboardingMobileImageBanner from './OnboardingMobileImageBanner'
import OnboardingFormPanel from './OnboardingFormPanel'
import OnboardingProgressBar from './OnboardingProgressBar'
import OnboardingNav from './OnboardingNav'

import Step01Destination from './steps/Step01Destination'
import StepTripVibe from './steps/StepTripVibe'
import Step02Companions from './steps/Step02Companions'
import Step03Timing from './steps/Step03Timing'
import Step04ServiceLevel from './steps/Step04ServiceLevel'
import Step06Priorities from './steps/Step06Priorities'
import Step07StyleBudget from './steps/Step07StyleBudget'
import Step08Location from './steps/Step08Location'
import Step09AdditionalDetails from './steps/Step09AdditionalDetails'
import StepThankYou from './steps/StepThankYou'

import StepMatching from '@/components/matching/StepMatching'
import StepResults from '@/components/matching/StepResults'
import { enterFunnelStep } from '@/lib/telemetry/collector'
import type { FunnelStep } from '@/lib/telemetry/types'
import { ONBOARD_STEP_NAMES } from '@/lib/onboarding/steps'

// ── Helpers to resolve dynamic image overrides per step ────────────────────

function resolveVibeImageKey(destination: string | undefined): string | null {
  if (!destination) return null
  // Try to match destination text to a vibe key
  const lower = destination.toLowerCase()
  for (const key of Object.keys(VIBE_IMAGES)) {
    const label = key.replace(/_/g, ' ')
    if (lower === label || lower.includes(label)) return key
  }
  return null
}

function getOverrideImage(
  stepName: string,
  data: Partial<OnboardingPayload>,
): { url: string; alt: string } | null {
  if (stepName === 'destination') {
    const vibeKey = resolveVibeImageKey(data.destination ?? undefined)
    if (vibeKey && VIBE_IMAGES[vibeKey]) return VIBE_IMAGES[vibeKey]
  }
  if (stepName === 'trip-vibe') {
    const vibe = data.tripVibe as string | undefined
    if (vibe && VIBE_IMAGES[vibe]) return VIBE_IMAGES[vibe]
  }
  if (stepName === 'service-level') {
    const level = data.serviceLevel as string | undefined
    if (level && SERVICE_LEVEL_IMAGES[level]) return SERVICE_LEVEL_IMAGES[level]
  }
  if (stepName === 'companions') {
    const companion = data.companions as string | undefined
    if (companion && COMPANION_IMAGES[companion]) return COMPANION_IMAGES[companion]
  }
  if (stepName === 'priorities') {
    const priorities = data.priorities as string[] | undefined
    if (priorities && priorities.length > 0) {
      const last = priorities[priorities.length - 1]
      if (last && PRIORITY_IMAGES[last]) return PRIORITY_IMAGES[last]
    }
  }
  return null
}

function OnboardingWizardInner() {
  const router = useRouter()
  const {
    data,
    stepIndex,
    stepName,
    direction,
    isWizardStep,
    isValid,
    updateField,
    updateFields,
    goNext,
    goBack,
    goTo,
  } = useOnboardingState()

  // Telemetry: track step dwell time
  const prevStepRef = useRef(stepName)
  useEffect(() => {
    if (stepName === prevStepRef.current) return
    prevStepRef.current = stepName
    if (stepName === 'thank-you') {
      enterFunnelStep('onboard_complete')
    } else if (isWizardStep) {
      const telemetryName = `onboard_${ONBOARD_STEP_NAMES[stepIndex]?.replace(/-/g, '_')}` as FunnelStep
      enterFunnelStep(telemetryName)
    } else if (stepName === 'matching') {
      enterFunnelStep('matching')
    } else if (stepName === 'results') {
      enterFunnelStep('results')
    }
  }, [stepName, stepIndex, isWizardStep])

  const [hoveredDestId, setHoveredDestId] = useState<string | null>(null)

  const [matchIntake, setMatchIntake] = useState<MatchIntakePayload | null>(null)
  const [advisorBrief, setAdvisorBrief] = useState<AdvisorBrief | null>(null)
  const [matchedAdvisors, setMatchedAdvisors] = useState<EnrichedMatchedAdvisor[] | null>(null)
  const [isNurtureLead, setIsNurtureLead] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    // Sanitize stale session-storage data before running full validation.
    // Priorities may contain hyphenated IDs from older sessions (now underscored).
    const validPrioritySet = new Set<string>(priorityOptions)
    const sanitized: Partial<OnboardingPayload> = {
      ...data,
      priorities: ((data.priorities as string[] | undefined) ?? []).filter((p) =>
        validPrioritySet.has(p),
      ) as OnboardingPayload['priorities'],
    }

    const parsed = onboardingPayloadSchema.safeParse(sanitized)
    if (!parsed.success) {
      const missing = parsed.error.issues
        .map((i) => i.path.join('.'))
        .filter(Boolean)
        .join(', ')
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[Onboarding] Validation failed:', parsed.error.flatten())
      }
      setSubmitError(
        missing
          ? `Please complete: ${missing}`
          : 'Please complete all required fields.',
      )
      return
    }

    const payload = parsed.data
    const intake = mapToMatchIntake(payload)
    const brief = buildSyntheticBrief(payload)
    setAdvisorBrief(brief)
    persistAdvisorBrief(brief)

    // Persist intake for the concierge to read
    try {
      sessionStorage.setItem('tbo_match_intake', JSON.stringify(intake))
      persistConciergeHandoff(intake, payload)
      markConciergeResumePending()
    } catch { /* ignore */ }

    // Persist the full onboarding payload as rich context for the LLM
    persistOnboardingContext(payload)

    // Await the session creation so we can persist the returned matchSessionId.
    // Previously this was fire-and-forget, which meant the downstream AI chat
    // flow could not find the session and created a duplicate orphan row —
    // losing all contact info and the onboarding_payload.
    try {
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload,
          attribution: readAttribution(),
        }),
      })
      const result = (await res.json()) as { ok?: boolean; matchSessionId?: string }
      if (result.ok && result.matchSessionId) {
        persistMatchSessionId(result.matchSessionId)
      }
    } catch { /* ignore — lead request has a server-side fallback */ }

    // Clear any stale concierge chat so the greeting reflects the latest preferences
    try { sessionStorage.removeItem('tbo_concierge_messages') } catch { /* ignore */ }

    // Redirect to the AI concierge with all data pre-loaded
    router.push('/?from=onboarding')
  }, [data, router])

  const handleThankYouContinue = useCallback(() => {
    void handleSubmit()
  }, [handleSubmit])

  const handleMatchingComplete = useCallback(
    (advisors: EnrichedMatchedAdvisor[], meta?: { isNurtureLead?: boolean }) => {
      setMatchedAdvisors(advisors)
      setIsNurtureLead(meta?.isNurtureLead ?? false)
      if (matchIntake) {
        persistMatchSession(advisors, matchIntake, advisorBrief)
      }
      goTo('results')
    },
    [matchIntake, advisorBrief, goTo],
  )

  const handleNext = useCallback(() => {
    if (stepIndex === TOTAL_WIZARD_STEPS - 1) {
      goTo('thank-you')
      return
    }
    goNext()
  }, [stepIndex, goNext, goTo])

  const currentStepConfig = STEPS[stepIndex]
  const isOptional = currentStepConfig?.optional ?? false

  // ── Resolve dynamic image override based on current selections ──────────
  const imageOverride = useMemo(() => {
    if (stepName === 'destination') {
      const id = hoveredDestId ?? data.destination ?? null
      if (id && DESTINATION_IMAGES[id]) return DESTINATION_IMAGES[id]
      return null
    }
    return getOverrideImage(stepName, data)
  }, [stepName, data, hoveredDestId])

  function renderStep() {
    switch (stepName) {
      case 'destination':
        return (
          <Step01Destination
            value={data.destination ?? ''}
            onChange={(v) => updateField('destination', v)}
            onHoverChange={setHoveredDestId}
          />
        )
      case 'trip-vibe':
        return (
          <StepTripVibe
            value={data.tripVibe}
            onChange={(v) => updateField('tripVibe', v as OnboardingPayload['tripVibe'])}
          />
        )
      case 'companions':
        return (
          <Step02Companions
            companions={(data.companions as string) ?? null}
            partySize={data.partySize ?? 1}
            onCompanionsChange={(c) =>
              updateField('companions', c as OnboardingPayload['companions'])
            }
            onPartySizeChange={(n) => updateField('partySize', n)}
          />
        )
      case 'timing':
        return (
          <Step03Timing
            timingMode={data.timingMode}
            travelDates={data.travelDates}
            lengthOfStay={data.lengthOfStay}
            flexibleMonths={data.flexibleMonths}
            onChange={(fields) => updateFields(fields as Partial<OnboardingPayload>)}
          />
        )
      case 'service-level':
        return (
          <Step04ServiceLevel
            value={(data.serviceLevel as string) ?? null}
            onChange={(v) =>
              updateField('serviceLevel', v as OnboardingPayload['serviceLevel'])
            }
          />
        )
      case 'priorities':
        return (
          <Step06Priorities
            selected={(data.priorities as string[]) ?? []}
            onChange={(p) =>
              updateField('priorities', p as OnboardingPayload['priorities'])
            }
          />
        )
      case 'style-budget':
        return (
          <Step07StyleBudget
            travelStyle={(data.travelStyle as string) ?? null}
            nightlySpend={data.nightlySpend}
            onStyleChange={(s) =>
              updateField('travelStyle', s as OnboardingPayload['travelStyle'])
            }
            onSpendChange={(n) => updateField('nightlySpend', n)}
          />
        )
      case 'location':
        return (
          <Step08Location
            value={data.homeRegion ?? null}
            onChange={(v) => updateField('homeRegion', v)}
          />
        )
      case 'details':
        return (
          <Step09AdditionalDetails
            value={data.additionalDetails ?? ''}
            onChange={(v) => updateField('additionalDetails', v)}
          />
        )
      default:
        return null
    }
  }

  // ── Post-wizard phases ──────────────────────────────────────────────────────

  if (stepName === 'results' && matchedAdvisors && matchedAdvisors.length > 0) {
    return (
      <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center overflow-y-auto py-10">
        <StepResults
          advisors={matchedAdvisors}
          intake={matchIntake}
          isNurtureLead={isNurtureLead}
          onBackToPreferences={() => goTo('style-budget')}
        />
      </div>
    )
  }

  if (stepName === 'matching' && matchIntake) {
    return (
      <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
        <StepMatching
          intake={matchIntake}
          advisorBrief={advisorBrief}
          onComplete={handleMatchingComplete}
        />
      </div>
    )
  }

  if (stepName === 'thank-you') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div
          className="flex h-[min(92vh,760px)] w-[min(96vw,1120px)] items-center justify-center overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(28,25,23,0.18)]"
          style={{ background: 'var(--cream, #FFFDF8)' }}
        >
          <OnboardingFormPanel stepKey={stepName} direction={direction}>
            <StepThankYou onContinue={handleThankYouContinue} />
            {submitError && (
              <p className="mt-4 text-center text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}
          </OnboardingFormPanel>
        </div>
      </div>
    )
  }

  if (!isWizardStep) return null

  // ── Wizard steps ────────────────────────────────────────────────────────────

  return (
    <OnboardingShell
      imagePanel={
        <OnboardingImagePanel
          stepIndex={stepIndex}
          overrideImageUrl={imageOverride?.url}
          overrideImageAlt={imageOverride?.alt}
        />
      }
      mobileImagePanel={
        <OnboardingMobileImageBanner
          stepIndex={stepIndex}
          overrideImageUrl={imageOverride?.url}
          overrideImageAlt={imageOverride?.alt}
        />
      }
      formPanel={
        <OnboardingFormPanel stepKey={stepName} direction={direction}>
          {renderStep()}
        </OnboardingFormPanel>
      }
      nav={
        <OnboardingNav
          onBack={stepIndex > 0 ? goBack : undefined}
          onNext={handleNext}
          nextDisabled={!isValid && !isOptional}
          showBack={stepIndex > 0}
          nextLabel={
            stepIndex === TOTAL_WIZARD_STEPS - 1 ? 'Submit' : 'Continue'
          }
        />
      }
      progressBar={<OnboardingProgressBar current={stepIndex + 1} />}
    />
  )
}

export default function OnboardingWizard() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'var(--cream, #FFFDF8)' }}
          >
            <div
              className="h-8 w-8 animate-spin rounded-full border-[2.5px] border-t-transparent"
              style={{ borderColor: 'var(--teal, #0F6E56)', borderTopColor: 'transparent' }}
            />
          </div>
        </div>
      }
    >
      <OnboardingWizardInner />
    </Suspense>
  )
}
