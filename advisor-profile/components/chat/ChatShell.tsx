'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthModal from '@/components/auth/AuthModal'
import UserProfileButton from '@/components/auth/UserProfileButton'
import ChatEmptyState from '@/components/chat/ChatEmptyState'
import ChatMain from '@/components/chat/ChatMain'
import ChatSidebar from '@/components/chat/ChatSidebar'
import { fetchConversationPeer } from '@/lib/chat/peer'
import type { ChatUser } from '@/lib/chat/types'
import { useAdvisorLink } from '@/hooks/useAdvisorLink'
import { useChatInbox } from '@/hooks/useChatInbox'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'

type Props = {
  activeConversationId: string | null
}

export default function ChatShell({ activeConversationId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: sessionLoading } = useSupabaseSession()
  const { advisorLink } = useAdvisorLink(user?.id ?? null)
  const { inbox, loading: inboxLoading } = useChatInbox(user?.id ?? null)
  const advisorIntent = searchParams.get('as') === 'advisor'
  const isAdvisor = Boolean(advisorLink) || advisorIntent

  const [resolvedPeer, setResolvedPeer] = useState<ChatUser | null>(null)

  const activePeer = useMemo(() => {
    if (!activeConversationId) return null
    return inbox.find((c) => c.id === activeConversationId)?.peer ?? resolvedPeer
  }, [inbox, activeConversationId, resolvedPeer])

  useEffect(() => {
    if (!activeConversationId || !user?.id) {
      setResolvedPeer(null)
      return
    }

    const fromInbox = inbox.find((c) => c.id === activeConversationId)?.peer
    if (fromInbox) {
      setResolvedPeer(fromInbox)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const peer = await fetchConversationPeer(activeConversationId, user.id)
        if (!cancelled) setResolvedPeer(peer)
      } catch {
        if (!cancelled) setResolvedPeer(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeConversationId, user?.id, inbox])

  const showMainOnMobile = Boolean(activeConversationId)

  if (sessionLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center" style={{ background: 'var(--cream)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Loading…
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 px-6" style={{ background: 'var(--cream)' }}>
        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          Sign in to view your messages.
        </p>
        <AuthModal
          open
          onClose={() => router.push('/')}
          onAuthenticated={() => router.refresh()}
          title="Sign in to chat"
          subtitle="Use email or Google to access your conversations."
        />
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: 'var(--cream)' }}>
      <div
        className="flex h-12 shrink-0 items-center justify-between border-b px-4 md:hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span className="text-sm font-semibold" style={{ color: '#0F6E56' }}>
          TravelConnect
        </span>
        <UserProfileButton />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className={`h-full ${showMainOnMobile ? 'hidden md:flex' : 'flex'} md:flex`}>
          <ChatSidebar
            inbox={inbox}
            activeConversationId={activeConversationId}
            loading={inboxLoading}
            isAdvisor={isAdvisor}
          />
        </div>

        {activeConversationId ? (
          <div className={`min-h-0 flex-1 ${showMainOnMobile ? 'flex' : 'hidden md:flex'}`}>
            <ChatMain
              conversationId={activeConversationId}
              currentUserId={user.id}
              peer={activePeer}
              viewerIsAdvisor={Boolean(advisorLink)}
              showBackOnMobile
              onBack={() => router.push('/chat')}
            />
          </div>
        ) : (
          <ChatEmptyState
            variant={isAdvisor ? 'advisor' : 'traveller'}
            advisorRouteId={advisorLink?.advisorRouteId ?? null}
            needsAdvisorLink={advisorIntent && !advisorLink}
          />
        )}
      </div>
    </div>
  )
}
