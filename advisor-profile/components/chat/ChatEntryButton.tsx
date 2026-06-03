'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import AuthModal from '@/components/auth/AuthModal'
import { openChatWithAdvisor } from '@/lib/chat/conversations'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'

type Props = {
  advisorRouteId: string
  advisorDisplayName: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Drop-in handler for "Chat with [Name]" buttons.
 * Shows auth modal when needed, then navigates to /chat/[conversationId].
 */
export default function ChatEntryButton({
  advisorRouteId,
  advisorDisplayName,
  className,
  style,
}: Props) {
  const router = useRouter()
  const { session, loading } = useSupabaseSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resumeAfterAuth = useRef(false)

  const firstName = advisorDisplayName.split(' ')[0]

  async function startChat() {
    setError(null)
    setBusy(true)

    try {
      const result = await openChatWithAdvisor(advisorRouteId)

      if (!result.ok) {
        if (result.reason === 'not_authenticated') {
          resumeAfterAuth.current = true
          setAuthOpen(true)
          return
        }
        if (result.reason === 'advisor_not_linked') {
          alert('This advisor has not set up their messaging inbox yet.')
          setBusy(false)
          return
        }
      }

      resumeAfterAuth.current = false
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
    void startChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resume when session appears
  }, [session, loading])

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
        {busy ? 'Opening chat…' : `Chat with ${firstName} →`}
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
    </>
  )
}
