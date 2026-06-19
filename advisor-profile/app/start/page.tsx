'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StepDestination from '@/components/matching/StepDestination'
import StepBudget from '@/components/matching/StepBudget'
import StepTravelStyle from '@/components/matching/StepTravelStyle'
import StepAIConcierge from '@/components/matching/StepAIConcierge'
import StepMatching from '@/components/matching/StepMatching'
import StepResults from '@/components/matching/StepResults'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { persistAdvisorBrief } from '@/lib/advisorBrief'
import { captureAttribution } from '@/lib/attribution'
import { persistAccountRoleIntent } from '@/lib/accountRole'
import {
  ensureMatchSessionSaved,
  persistMatchSession,
  readMatchSession,
  saveMatchSession,
} from '@/lib/matchSession'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import { validateIntake } from '@/lib/intakeValidation'
import { useSessionTelemetry } from '@/hooks/useSessionTelemetry'
import { enterFunnelStep } from '@/lib/telemetry/collector'
import type { FunnelStep } from '@/lib/telemetry/types'

// ── Step name ↔ URL param mapping ─────────────────────────────────────────────
// Each step gets its own URL so the Android back button navigates between
// questions instead of closing the Instagram in-app browser.
const STEP_NAMES = ['destination', 'budget', 'style', 'chat', 'matching', 'results'] as const
type StepName = (typeof STEP_NAMES)[number]

function stepIndexFromParam(param: string | null): number {
  const idx = STEP_NAMES.indexOf((param ?? 'destination') as StepName)
  return idx === -1 ? 0 : idx
}

const INTAKE_SESSION_KEY = 'tbo_match_intake'

function persistIntakePartial(partial: Record<string, unknown>) {
  try {
    const existing = sessionStorage.getItem(INTAKE_SESSION_KEY)
    const current = existing ? JSON.parse(existing) : {}
    sessionStorage.setItem(INTAKE_SESSION_KEY, JSON.stringify({ ...current, ...partial }))
  } catch {
    /* ignore */
  }
}

function StartFunnelInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Derive step from URL so back button works correctly
  const stepParam = searchParams.get('step')
  const currentStep = stepIndexFromParam(stepParam)

  const [destination, setDestination] = useState<string | null>(searchParams.get('destination') ?? null)
  const [budgetLakh, setBudgetLakh] = useState(
    searchParams.has('budgetLakh') ? Number(searchParams.get('budgetLakh')) : 15
  )
  const [travelStyle, setTravelStyle] = useState<string | null>(searchParams.get('travelStyle') ?? null)

  const [advisorBrief, setAdvisorBrief] = useState<AdvisorBrief | null>(null)
  const [matchedAdvisors, setMatchedAdvisors] = useState<EnrichedMatchedAdvisor[] | null>(null)
  const [intakeError, setIntakeError] = useState<string | null>(null)
  const [isNurtureLead, setIsNurtureLead] = useState(false)

  // Sensible defaults for fields not collected in 3-question funnel
  const vibe = 'Culture'
  const pace = 'Balanced'
  const timing = 'Next 6 months'
  const duration = '1-2 weeks'

  const intakePayload: MatchIntakePayload | null =
    destination && travelStyle
      ? { destination, budgetLakh, travelStyle, vibe, pace, timing, duration }
      : null

  const intakeIsValid = intakePayload ? validateIntake(intakePayload).valid : false

  useSessionTelemetry()

  useEffect(() => {
    const stepMap: Record<number, FunnelStep> = {
      0: 'destination',
      1: 'budget',
      2: 'style',
      3: 'chat',
      4: 'matching',
      5: 'results',
    }
    const funnelStep = stepMap[currentStep]
    if (funnelStep) enterFunnelStep(funnelStep)
  }, [currentStep])

  // On mount: capture UTM params from ad click + set role
  useEffect(() => {
    captureAttribution()
    persistAccountRoleIntent('traveller')
  }, [])

  // Restore partial intake from sessionStorage on page refresh inside WebView
  useEffect(() => {
    try {
      // If we are landing back on the results step (e.g. after OAuth redirect), restore match results
      if (currentStep === 5) {
        const session = readMatchSession()
        if (session) {
          setMatchedAdvisors(session.advisors)
          if (session.advisorBrief) setAdvisorBrief(session.advisorBrief)
          if (!session.matchSessionId) {
            void ensureMatchSessionSaved()
          }
        }
      }

      const raw = sessionStorage.getItem(INTAKE_SESSION_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, unknown>
      if (typeof saved.destination === 'string') setDestination(saved.destination)
      if (typeof saved.budgetLakh === 'number') setBudgetLakh(saved.budgetLakh)
      if (typeof saved.travelStyle === 'string') setTravelStyle(saved.travelStyle)
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Navigate to the next step, updating the URL so browser back button works */
  const goTo = useCallback(
    (step: StepName) => {
      // Preserve existing query params (UTMs) and just change/add the step param
      const params = new URLSearchParams(window.location.search)
      params.set('step', step)
      router.push(`/start?${params.toString()}`)
    },
    [router],
  )

  // Block ?step=chat deep-links when session intake fails guardrails
  useEffect(() => {
    if (currentStep === 3 && intakePayload && !intakeIsValid) {
      setIntakeError(validateIntake(intakePayload).message ?? 'Please update your trip details.')
      goTo('style')
    }
  }, [currentStep, intakePayload, intakeIsValid, goTo])

  const handleConciergeHandoff = useCallback(
    (brief: AdvisorBrief) => {
      setAdvisorBrief(brief)
      persistAdvisorBrief(brief)
      goTo('matching')
    },
    [goTo],
  )

  const handleMatchingComplete = useCallback(
    (advisors: EnrichedMatchedAdvisor[], meta?: { isNurtureLead?: boolean }) => {
      setMatchedAdvisors(advisors)
      setIsNurtureLead(meta?.isNurtureLead ?? false)
      goTo('results')
      if (intakePayload) {
        persistMatchSession(advisors, intakePayload, advisorBrief)
        void saveMatchSession(advisors, intakePayload, advisorBrief)
      }
    },
    [intakePayload, advisorBrief, goTo],
  )

  return (
    <div
      className="flex min-h-0 h-full flex-1 flex-col"
      style={{
        background:
          'radial-gradient(ellipse 90% 45% at 50% -8%, var(--grad-1) 0%, transparent 55%), var(--cream)',
      }}
    >

      <main
        id="main"
        className={`relative isolate z-10 mx-auto flex min-h-0 h-full w-full flex-1 flex-col ${
          currentStep === 3 ? 'max-w-none' : 'max-w-[90rem]'
        }`}
        role="main"
      >
        {/* Step 0: Destination */}
        {currentStep === 0 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepDestination
              onNext={(dest) => {
                setDestination(dest)
                persistIntakePartial({ destination: dest })
                goTo('budget')
              }}
            />
          </div>
        )}

        {/* Step 1: Budget */}
        {currentStep === 1 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepBudget
              initialBudgetLakh={budgetLakh}
              onBack={() => goTo('destination')}
              onNext={(b) => {
                setBudgetLakh(b)
                persistIntakePartial({ budgetLakh: b })
                goTo('style')
              }}
            />
          </div>
        )}

        {/* Step 2: Travel Style */}
        {currentStep === 2 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepTravelStyle
              initialTravelStyle={travelStyle}
              onBack={() => goTo('budget')}
              onNext={(style) => {
                if (!destination) return
                const candidate: MatchIntakePayload = {
                  destination,
                  budgetLakh,
                  travelStyle: style,
                  vibe,
                  pace,
                  timing,
                  duration,
                }
                const gate = validateIntake(candidate)
                if (!gate.valid) {
                  setIntakeError(gate.message ?? 'Please complete all fields.')
                  return
                }
                setIntakeError(null)
                setTravelStyle(style)
                persistIntakePartial({
                  destination,
                  budgetLakh,
                  travelStyle: style,
                  vibe,
                  pace,
                  timing,
                  duration,
                })
                goTo('chat')
              }}
            />
            {intakeError && (
              <p className="mt-2 text-center text-sm text-red-600" role="alert">
                {intakeError}
              </p>
            )}
          </div>
        )}

        {/* Step 3: AI Concierge Chat */}
        {currentStep === 3 && intakePayload && intakeIsValid && (
          <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-4">
            {intakeError && (
              <p className="mb-2 text-center text-sm text-red-600" role="alert">
                {intakeError}
              </p>
            )}
            <StepAIConcierge
              intake={intakePayload}
              onBack={() => goTo('style')}
              onHandoff={handleConciergeHandoff}
            />
          </div>
        )}

        {/* Step 4: Matching animation */}
        {currentStep === 4 && intakePayload && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepMatching
              intake={intakePayload}
              advisorBrief={advisorBrief}
              onComplete={handleMatchingComplete}
              onGuardrailBlocked={(message, code) => {
                setIntakeError(message)
                goTo(code === 'READINESS_BLOCKED' ? 'chat' : 'style')
              }}
            />
          </div>
        )}

        {/* Step 5: Results */}
        {currentStep === 5 && matchedAdvisors && matchedAdvisors.length > 0 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center overflow-y-auto py-10">
            <StepResults
              advisors={matchedAdvisors}
              intake={intakePayload}
              isNurtureLead={isNurtureLead}
              onBackToPreferences={() => {
                setMatchedAdvisors(null)
                setAdvisorBrief(null)
                goTo('budget')
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default function StartFunnelPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh flex-col items-center justify-center bg-cream">
        <span className="text-sm font-semibold tracking-wide text-teal-brand animate-pulse">Loading TravelConnect...</span>
      </div>
    }>
      <StartFunnelInner />
    </Suspense>
  )
}
