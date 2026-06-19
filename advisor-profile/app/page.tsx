'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ensureMatchSessionSaved,
  persistMatchSession,
  readMatchSession,
  saveMatchSession,
  MATCH_RESULTS_VIEW,
} from '@/lib/matchSession'
import StepDestination from '@/components/matching/StepDestination'
import TravellerReturnModal from '@/components/matching/TravellerReturnModal'
import StepPreferences from '@/components/matching/StepPreferences'
import StepAIConcierge, { CHAT_MESSAGES_KEY as CONCIERGE_MESSAGES_KEY } from '@/components/matching/StepAIConcierge'
import StepMatching from '@/components/matching/StepMatching'
import StepResults from '@/components/matching/StepResults'
import RoleSelectionScreen from '@/components/matching/RoleSelectionScreen'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { persistAdvisorBrief } from '@/lib/advisorBrief'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import { validateIntake } from '@/lib/intakeValidation'
import AuthModal from '@/components/auth/AuthModal'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import {
  fetchMyAccountRole,
  persistAccountRoleIntent,
  setMyAccountRole,
} from '@/lib/accountRole'
import { useSessionTelemetry } from '@/hooks/useSessionTelemetry'
import { enterFunnelStep } from '@/lib/telemetry/collector'
import type { FunnelStep } from '@/lib/telemetry/types'

export default function MatchingIntakePage() {
  const router = useRouter()
  const { user } = useSupabaseSession()

  // -1 = welcome/role-selection screen, 0+ = traveller flow steps
  const [currentStep, setCurrentStep] = useState(-1)
  const [advisorAuthOpen, setAdvisorAuthOpen] = useState(false)
  const [travellerReturnOpen, setTravellerReturnOpen] = useState(false)
  const [travellerReturnStep, setTravellerReturnStep] = useState<'selection' | 'post_login'>('selection')

  const [destination, setDestination] = useState<string | null>(null)
  const [budgetLakh, setBudgetLakh] = useState(15)
  const [travelStyle, setTravelStyle] = useState<string | null>(null)
  const [vibe, setVibe] = useState<string | null>('Culture')
  const [pace, setPace] = useState<string | null>('Balanced')
  const [timing, setTiming] = useState<string | null>('Next 6 months')
  const [duration, setDuration] = useState<string | null>('1-2 weeks')
  const [advisorBrief, setAdvisorBrief] = useState<AdvisorBrief | null>(null)
  const [matchedAdvisors, setMatchedAdvisors] = useState<EnrichedMatchedAdvisor[] | null>(null)
  const [intakeError, setIntakeError] = useState<string | null>(null)
  const [isNurtureLead, setIsNurtureLead] = useState(false)

  const intakePayload: MatchIntakePayload | null =
    destination && travelStyle && vibe && pace && timing && duration
      ? { destination, budgetLakh, travelStyle, vibe, pace, timing, duration }
      : null

  const intakeIsValid = intakePayload ? validateIntake(intakePayload).valid : false

  useSessionTelemetry()

  useEffect(() => {
    const stepMap: Record<number, FunnelStep | null> = {
      0: 'destination',
      1: 'budget',
      2: 'chat',
      3: 'matching',
      4: 'results',
    }
    const funnelStep = stepMap[currentStep]
    if (funnelStep) enterFunnelStep(funnelStep)
  }, [currentStep])

  const handleConciergeHandoff = useCallback((brief: AdvisorBrief) => {
    setAdvisorBrief(brief)
    persistAdvisorBrief(brief)
    setCurrentStep(3)
  }, [])

  const handleMatchingComplete = useCallback(
    (advisors: EnrichedMatchedAdvisor[], meta?: { isNurtureLead?: boolean }) => {
      setMatchedAdvisors(advisors)
      setIsNurtureLead(meta?.isNurtureLead ?? false)
      setCurrentStep(4)
      if (intakePayload) {
        persistMatchSession(advisors, intakePayload, advisorBrief)
        void saveMatchSession(advisors, intakePayload, advisorBrief)
      }
      // Matching fully succeeded — safe to clear the concierge chat history now
      try { sessionStorage.removeItem(CONCIERGE_MESSAGES_KEY) } catch { /* ignore */ }
    },
    [intakePayload, advisorBrief],
  )

  async function handleTravellerStart() {
    // Show the return/fresh-start modal before entering the flow
    setTravellerReturnStep('selection')
    setTravellerReturnOpen(true)
  }

  async function proceedAsTraveller() {
    setTravellerReturnOpen(false)
    if (user) {
      const role = await fetchMyAccountRole()
      if (role === 'advisor') {
        alert(
          'This account is registered as a Travel Advisor. Sign in via "I am a Travel Advisor" to open your client inbox.',
        )
        return
      }
      try {
        await setMyAccountRole('traveller')
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Could not start traveller flow')
        return
      }
    } else {
      persistAccountRoleIntent('traveller')
    }
    setCurrentStep(0)
  }

  async function handleAdvisorClick() {
    if (user) {
      const role = await fetchMyAccountRole()
      if (role === 'traveller') {
        alert(
          'This account is registered as a Traveller. Use “I am a Traveller” to find and message advisors.',
        )
        return
      }
    }
    persistAccountRoleIntent('advisor')
    if (user) {
      router.push('/chat')
    } else {
      setAdvisorAuthOpen(true)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)

    // Handle OAuth callback resume for traveller flow
    if (params.get('resume_traveller') === 'true') {
      setTravellerReturnStep('post_login')
      setTravellerReturnOpen(true)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('resume_traveller')
      window.history.replaceState({}, '', newUrl.toString())
    }

    const isResultsView = params.get('view') === MATCH_RESULTS_VIEW
    const hasPendingChat = !!sessionStorage.getItem('pending_chat_advisor_id')

    if (!isResultsView && !hasPendingChat) return

    const session = readMatchSession()
    if (!session) return

    const { advisors, intake, advisorBrief: brief } = session
    setMatchedAdvisors(advisors)
    setDestination(intake.destination)
    setBudgetLakh(intake.budgetLakh)
    setTravelStyle(intake.travelStyle)
    setVibe(intake.vibe)
    setPace(intake.pace)
    setTiming(intake.timing)
    setDuration(intake.duration)
    if (brief) setAdvisorBrief(brief)
    setCurrentStep(4)
    if (!session.matchSessionId) {
      void ensureMatchSessionSaved()
    }
  }, [])

  return (
    <div
      className="flex min-h-0 h-full flex-1 flex-col"
      style={{
        background:
          'radial-gradient(ellipse 90% 45% at 50% -8%, var(--grad-1) 0%, transparent 55%), var(--cream)',
      }}
    >

      {/* Advisor Auth Modal */}
      <AuthModal
        open={advisorAuthOpen}
        onClose={() => setAdvisorAuthOpen(false)}
        onAuthenticated={() => {
          setAdvisorAuthOpen(false)
          router.push('/chat')
        }}
        accountRole="advisor"
        title="Advisor sign in"
        subtitle="Sign in to access your advisor inbox and manage client conversations."
      />

      {/* Traveller Return Modal — shown between role selection and destination step */}
      <TravellerReturnModal
        open={travellerReturnOpen}
        initialStep={travellerReturnStep}
        onClose={() => {
          setTravellerReturnOpen(false)
          setTravellerReturnStep('selection')
        }}
        onGoToChat={() => {
          setTravellerReturnOpen(false)
          router.push('/chat')
        }}
        onGoToMatches={(() => {
          const session = readMatchSession()
          if (!session?.advisors?.length) return undefined
          return () => {
            setMatchedAdvisors(session.advisors)
            setDestination(session.intake.destination)
            setBudgetLakh(session.intake.budgetLakh)
            setTravelStyle(session.intake.travelStyle)
            setVibe(session.intake.vibe)
            setPace(session.intake.pace)
            setTiming(session.intake.timing)
            setDuration(session.intake.duration)
            if (session.advisorBrief) setAdvisorBrief(session.advisorBrief)
            setTravellerReturnOpen(false)
            setCurrentStep(4)
          }
        })()}
        onFreshStart={() => void proceedAsTraveller()}
        onFreshSignedIn={() => void proceedAsTraveller()}
      />

      <main
        id="main"
        className={`relative isolate z-10 mx-auto flex min-h-0 h-full w-full flex-1 flex-col ${
          currentStep === 2 ? 'max-w-none' : 'max-w-[90rem]'
        }`}
        role="main"
      >
        {currentStep === -1 && (
          <RoleSelectionScreen
            onTraveller={() => void handleTravellerStart()}
            onAdvisor={() => void handleAdvisorClick()}
          />
        )}

        {currentStep === 0 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepDestination
              onNext={(dest) => {
                setDestination(dest)
                setCurrentStep(1)
              }}
            />
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepPreferences
              initialBudgetLakh={budgetLakh}
              initialTravelStyle={travelStyle}
              onBack={() => setCurrentStep(0)}
              onNext={({ budgetLakh: b, travelStyle: style }) => {
                if (!destination) return
                const candidate: MatchIntakePayload = {
                  destination,
                  budgetLakh: b,
                  travelStyle: style,
                  vibe: vibe ?? 'Culture',
                  pace: pace ?? 'Balanced',
                  timing: timing ?? 'Next 6 months',
                  duration: duration ?? '1-2 weeks',
                }
                const gate = validateIntake(candidate)
                if (!gate.valid) {
                  setIntakeError(gate.message ?? 'Please complete all fields.')
                  return
                }
                setIntakeError(null)
                setBudgetLakh(b)
                setTravelStyle(style)
                if (typeof window !== 'undefined') {
                  try {
                    sessionStorage.setItem(
                      'tbo_match_intake',
                      JSON.stringify(candidate),
                    )
                  } catch {
                    /* ignore */
                  }
                }
                setCurrentStep(2)
              }}
            />
            {intakeError && (
              <p className="mt-2 text-center text-sm text-red-600" role="alert">
                {intakeError}
              </p>
            )}
          </div>
        )}

        {currentStep === 2 && intakePayload && intakeIsValid && (
          <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-4">
            {intakeError && (
              <p className="mb-2 text-center text-sm text-red-600" role="alert">
                {intakeError}
              </p>
            )}
            <StepAIConcierge
              intake={intakePayload}
              onBack={() => setCurrentStep(1)}
              onHandoff={handleConciergeHandoff}
              onTransferStarted={() => setIntakeError(null)}
            />
          </div>
        )}

        {currentStep === 3 && intakePayload && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepMatching
              intake={intakePayload}
              advisorBrief={advisorBrief}
              onComplete={handleMatchingComplete}
              onGuardrailBlocked={(message, code) => {
                setIntakeError(message)
                setCurrentStep(code === 'READINESS_BLOCKED' ? 2 : 1)
              }}
            />
          </div>
        )}

        {currentStep === 4 && matchedAdvisors && matchedAdvisors.length > 0 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center overflow-y-auto py-10">
            <StepResults
              advisors={matchedAdvisors}
              intake={intakePayload}
              isNurtureLead={isNurtureLead}
              onBackToPreferences={() => {
                setMatchedAdvisors(null)
                setAdvisorBrief(null)
                setCurrentStep(1)
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}
