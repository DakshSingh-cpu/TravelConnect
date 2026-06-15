'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import AuthModal from '@/components/auth/AuthModal'
import PhoneVerificationModal from '@/components/matching/PhoneVerificationModal'
import { openChatWithAdvisor } from '@/lib/chat/conversations'
import { readMatchSessionId } from '@/lib/matchSession'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { isPhoneVerifiedFromUser } from '@/lib/phoneVerification'

type Props = {
  advisorRouteId: string
  advisorDisplayName: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Drop-in handler for "Chat with [Name]" buttons.
 * Gate order: auth -> phone OTP -> chat creation.
 */
export default function ChatEntryButton({
  advisorRouteId,
  advisorDisplayName,
  className,
  style,
}: Props) {
  const router = useRouter()
  const { session, loading, refresh } = useSupabaseSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resumeAfterAuth = useRef(false)
  const resumeAfterPhone = useRef(false)

  const firstName = advisorDisplayName.split(' ')[0]

  async function startChat() {
    setError(null)
    setBusy(true)

    try {
      const result = await openChatWithAdvisor(advisorRouteId, readMatchSessionId())

      if (!result.ok) {
        if (result.reason === 'not_authenticated') {
          resumeAfterAuth.current = true
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pending_chat_advisor_id', advisorRouteId)
          }
          setAuthOpen(true)
          return
        }
        if (result.reason === 'phone_not_verified') {
          resumeAfterPhone.current = true
          setPhoneModalOpen(true)
          return
        }
        if (result.reason === 'advisor_not_linked') {
          alert('This advisor has not set up their messaging inbox yet.')
          setBusy(false)
          return
        }
      }

      resumeAfterAuth.current = false
      resumeAfterPhone.current = false
      if (result.briefSaveFailed) {
        setError(
          'Chat opened, but your trip brief could not be saved for the advisor. Open chat from match results again or reload this thread.',
        )
      }
      router.push(`/chat/${result.conversationId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open chat')
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

    void startChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resume when session appears
  }, [session, loading])

  useEffect(() => {
    if (loading || !session || typeof window === 'undefined') return
    const pending = sessionStorage.getItem('pending_chat_advisor_id')
    if (pending === advisorRouteId) {
      sessionStorage.removeItem('pending_chat_advisor_id')
      void startChat()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, advisorRouteId])

  async function handlePhoneVerified() {
    setPhoneModalOpen(false)
    await refresh()
    if (resumeAfterPhone.current) {
      resumeAfterPhone.current = false
      void startChat()
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading || busy}
        onClick={() => void startChat()}
        className={
          className ??
          'w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] hover:opacity-95 disabled:opacity-60'
        }
        style={
          style ?? { background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }
        }
      >
        {busy ? 'Opening chat\u2026' : `Chat with ${firstName} \u2192`}
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
        subtitle="Sign in to send a message to your advisor."
      />

      {phoneModalOpen && (
        <PhoneVerificationModal
          onVerified={() => void handlePhoneVerified()}
          onDismiss={() => {
            resumeAfterPhone.current = false
            setPhoneModalOpen(false)
            setBusy(false)
          }}
        />
      )}
    </>
  )
}
