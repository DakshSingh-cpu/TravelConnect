'use client'

import { useEffect, useRef, useState } from 'react'
import AuthModal from '@/components/auth/AuthModal'
import PhoneVerificationModal from '@/components/matching/PhoneVerificationModal'
import LeadSubmittedScreen from '@/components/matching/LeadSubmittedScreen'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { isPhoneVerifiedFromUser } from '@/lib/phoneVerification'
import { requestLeadAssignment } from '@/lib/leads/requestLead'
import { ensureMyProfile } from '@/lib/chat/ensureProfile'
import { readContactPhone } from '@/lib/onboarding/useOnboardingState'

type Props = {
  advisorRouteId: string
  advisorDisplayName: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Gate order: auth -> phone OTP + browser location -> background lead vetting request.
 * Traveller always sees wait-for-email screen (no auto-redirect).
 */
export default function ChatEntryButton({
  advisorRouteId,
  advisorDisplayName,
  className,
  style,
}: Props) {
  const { session, loading, refresh } = useSupabaseSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [showWaitScreen, setShowWaitScreen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resumeAfterAuth = useRef(false)
  const resumeAfterPhone = useRef(false)
  // Set to true right after OTP verification so the stale session.user check is
  // bypassed for the single immediate re-invocation of submitLeadRequest().
  const phoneJustVerified = useRef(false)

  const firstName = advisorDisplayName.split(' ')[0]

  async function submitLeadRequest() {
    setError(null)
    setBusy(true)

    try {
      if (!session) {
        resumeAfterAuth.current = true
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pending_chat_advisor_id', advisorRouteId)
        }
        setAuthOpen(true)
        return
      }

      // Skip the phone check if we *just* verified — the React session state may
      // not have propagated yet even though Supabase has confirmed the phone.
      const skipPhoneCheck = phoneJustVerified.current
      phoneJustVerified.current = false

      if (!skipPhoneCheck && !isPhoneVerifiedFromUser(session.user)) {
        resumeAfterPhone.current = true
        setPhoneModalOpen(true)
        return
      }

      await ensureMyProfile()

      const result = await requestLeadAssignment(advisorRouteId)

      if (!result.ok) {
        if (result.code === 'NOT_AUTHENTICATED') {
          resumeAfterAuth.current = true
          setAuthOpen(true)
          return
        }
        if (result.code === 'PHONE_NOT_VERIFIED') {
          resumeAfterPhone.current = true
          setPhoneModalOpen(true)
          return
        }
        if (result.code === 'ADVISOR_NOT_LINKED') {
          alert('This advisor has not set up their messaging inbox yet.')
          setBusy(false)
          return
        }
        if (result.code === 'MATCH_SESSION_REQUIRED') {
          setError('Your match session expired. Please run matching again.')
          setBusy(false)
          return
        }
        if (result.code === 'LEAD_BLOCKED') {
          setError('We were unable to process this request. Please try a different advisor or start a new search.')
          setBusy(false)
          return
        }
        setError(result.error)
        return
      }

      resumeAfterAuth.current = false
      resumeAfterPhone.current = false

      if (result.status === 'vetting' || result.status === 'pending') {
        setShowWaitScreen(true)
        return
      }

      if (result.status === 'accepted') {
        setShowWaitScreen(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!resumeAfterAuth.current || loading || !session) return
    setAuthOpen(false)

    if (!isPhoneVerifiedFromUser(session.user)) {
      resumeAfterAuth.current = false
      resumeAfterPhone.current = true
      setPhoneModalOpen(true)
      return
    }

    void submitLeadRequest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading])

  useEffect(() => {
    if (loading || !session || typeof window === 'undefined') return
    const pending = sessionStorage.getItem('pending_chat_advisor_id')
    if (pending === advisorRouteId) {
      sessionStorage.removeItem('pending_chat_advisor_id')
      void submitLeadRequest()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, advisorRouteId])

  async function handlePhoneVerified() {
    setPhoneModalOpen(false)
    await refresh()
    if (resumeAfterPhone.current) {
      resumeAfterPhone.current = false
      // Mark that the phone was just verified so submitLeadRequest skips the
      // stale session.user.phone check (the React state update is async).
      phoneJustVerified.current = true
      void submitLeadRequest()
    }
  }

  if (showWaitScreen) {
    return <LeadSubmittedScreen onDismiss={() => setShowWaitScreen(false)} />
  }

  return (
    <>
      <button
        type="button"
        disabled={loading || busy}
        onClick={() => void submitLeadRequest()}
        className={
          className ??
          'w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] hover:opacity-95 disabled:opacity-60'
        }
        style={
          style ?? { background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }
        }
      >
        {busy ? 'Sending request\u2026' : `Chat with ${firstName} \u2192`}
      </button>

      {error && (
        <p className="mt-2 text-center text-xs" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => {
          resumeAfterAuth.current = false
          setAuthOpen(false)
        }}
        onAuthenticated={() => {
          resumeAfterAuth.current = true
          setAuthOpen(false)
        }}
        accountRole="traveller"
        title={`Chat with ${firstName}`}
        subtitle="Sign in to send a request to your advisor."
      />

      {phoneModalOpen && (
        <PhoneVerificationModal
          onVerified={() => void handlePhoneVerified()}
          onDismiss={() => {
            resumeAfterPhone.current = false
            setPhoneModalOpen(false)
            setBusy(false)
          }}
          initialPhone={readContactPhone() ?? undefined}
        />
      )}
    </>
  )
}
