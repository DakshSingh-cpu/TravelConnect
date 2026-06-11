'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { readMatchSession, persistMatchSession, MATCH_RESULTS_VIEW } from '@/lib/matchSession'
import StepDestination from '@/components/matching/StepDestination'
import TravellerReturnModal from '@/components/matching/TravellerReturnModal'
import StepPreferences from '@/components/matching/StepPreferences'
import StepAIConcierge from '@/components/matching/StepAIConcierge'
import StepMatching from '@/components/matching/StepMatching'
import StepResults from '@/components/matching/StepResults'
import RoleSelectionScreen from '@/components/matching/RoleSelectionScreen'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { persistAdvisorBrief } from '@/lib/advisorBrief'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import AuthModal from '@/components/auth/AuthModal'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import {
  fetchMyAccountRole,
  persistAccountRoleIntent,
  setMyAccountRole,
} from '@/lib/accountRole'

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

  const intakePayload: MatchIntakePayload | null =
    destination && travelStyle && vibe && pace && timing && duration
      ? { destination, budgetLakh, travelStyle, vibe, pace, timing, duration }
      : null

  const handleConciergeHandoff = useCallback((brief: AdvisorBrief) => {
    setAdvisorBrief(brief)
    persistAdvisorBrief(brief)
    setCurrentStep(3)
  }, [])

  const handleMatchingComplete = useCallback(
    (advisors: EnrichedMatchedAdvisor[]) => {
      setMatchedAdvisors(advisors)
      setCurrentStep(4)
      if (intakePayload) {
        persistMatchSession(advisors, intakePayload, advisorBrief)
      }
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
  }, [])

  return (
    <div
      className="flex flex-1 flex-col"
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
        onFreshStart={() => void proceedAsTraveller()}
        onFreshSignedIn={() => void proceedAsTraveller()}
      />

      <main
        id="main"
        className={`relative isolate z-10 mx-auto flex min-h-[calc(100dvh-3.25rem)] w-full flex-1 flex-col ${
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
                setBudgetLakh(b)
                setTravelStyle(style)
                if (typeof window !== 'undefined' && destination) {
                  try {
                    sessionStorage.setItem(
                      'tbo_match_intake',
                      JSON.stringify({
                        destination,
                        budgetLakh: b,
                        travelStyle: style,
                        vibe,
                        pace,
                        timing,
                        duration,
                      }),
                    )
                  } catch {
                    /* ignore */
                  }
                }
                setCurrentStep(2)
              }}
            />
          </div>
        )}

        {currentStep === 2 && intakePayload && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] w-full flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-4">
            <StepAIConcierge
              intake={intakePayload}
              onBack={() => setCurrentStep(1)}
              onHandoff={handleConciergeHandoff}
            />
          </div>
        )}

        {currentStep === 3 && intakePayload && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center justify-center overflow-y-auto py-10 px-4 sm:px-8">
            <StepMatching
              intake={intakePayload}
              advisorBrief={advisorBrief}
              onComplete={handleMatchingComplete}
            />
          </div>
        )}

        {currentStep === 4 && matchedAdvisors && matchedAdvisors.length > 0 && (
          <div className="flex min-h-[calc(100dvh-3.25rem)] flex-1 flex-col items-center overflow-y-auto py-10">
            <StepResults
              advisors={matchedAdvisors}
              intake={intakePayload}
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
