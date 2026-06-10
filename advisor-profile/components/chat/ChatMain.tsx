'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LayoutGroup, motion } from 'framer-motion'
import MessageBubble from '@/components/chat/MessageBubble'
import ClientBriefOverlay from '@/components/chat/ClientBriefOverlay'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useConversationBrief } from '@/hooks/useConversationBrief'
import { useTravellerBriefSync } from '@/hooks/useTravellerBriefSync'
import { isLinkedTravelAdvisor } from '@/lib/chat/peerRole'
import { matchResultsHref } from '@/lib/matchSession'
import type { ChatUser } from '@/lib/chat/types'

type Props = {
  conversationId: string
  currentUserId: string
  peer: ChatUser | null
  /** True when the signed-in user is a travel advisor (viewing a client thread). */
  viewerIsAdvisor: boolean
  onBack?: () => void
  showBackOnMobile?: boolean
}

function peerDisplayName(peer: ChatUser | null, peerIsAdvisor: boolean | null) {
  if (peer?.full_name?.trim()) return peer.full_name.trim()
  if (peerIsAdvisor === true) return 'Advisor'
  if (peerIsAdvisor === false) return 'Traveller'
  return 'Chat'
}

function peerSubtitle(peerIsAdvisor: boolean | null, viewerIsAdvisor: boolean) {
  if (peerIsAdvisor === true) return 'Verified TravelConnect advisor'
  if (peerIsAdvisor === false) {
    return viewerIsAdvisor ? 'TravelConnect traveller · your client' : 'Traveller'
  }
  return viewerIsAdvisor ? 'Conversation' : 'Verified TravelConnect advisor'
}

export default function ChatMain({
  conversationId,
  currentUserId,
  peer,
  viewerIsAdvisor,
  onBack,
  showBackOnMobile,
}: Props) {
  const { messages, loading, sending, error, sendMessage } = useChatMessages(
    conversationId,
    currentUserId,
  )
  const { brief, loading: briefLoading } = useConversationBrief(conversationId, viewerIsAdvisor)
  const { syncNotice } = useTravellerBriefSync(conversationId, !viewerIsAdvisor)
  const [draft, setDraft] = useState('')
  const [peerIsAdvisor, setPeerIsAdvisor] = useState<boolean | null>(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const displayName = peerDisplayName(peer, peerIsAdvisor)
  const canOpenBrief = viewerIsAdvisor

  useEffect(() => {
    if (!peer?.id) {
      setPeerIsAdvisor(null)
      return
    }

    let cancelled = false
    void isLinkedTravelAdvisor(peer.id).then((linked) => {
      if (!cancelled) setPeerIsAdvisor(linked)
    })

    return () => {
      cancelled = true
    }
  }, [peer?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, conversationId])

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return

    try {
      await sendMessage(text)
      setDraft('')
    } catch {
      // error surfaced via hook state
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void handleSend()
  }

  return (
    <LayoutGroup id={`chat-brief-${conversationId}`}>
    <section className="relative flex min-h-0 flex-1 flex-col" style={{ background: 'var(--cream)' }}>
      <header
        className="flex h-14 shrink-0 items-center gap-3 border-b px-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {showBackOnMobile && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mr-1 rounded-lg px-2 py-1 text-sm font-medium md:hidden"
            style={{ color: 'var(--teal)' }}
            aria-label="Back to conversations"
          >
            ←
          </button>
        )}
        {canOpenBrief ? (
          <motion.button
            type="button"
            onClick={() => setBriefOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left transition-colors hover:bg-black/[0.03] active:bg-black/[0.05]"
            aria-label={`View client brief for ${displayName}`}
            aria-expanded={briefOpen}
            whileTap={{ scale: 0.99 }}
          >
            <PeerAvatar
              name={displayName}
              url={peer?.avatar_url ?? null}
              layoutId="client-brief-avatar"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {displayName}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {peerSubtitle(peerIsAdvisor, viewerIsAdvisor)}
                {brief && !briefLoading && (
                  <span style={{ color: 'var(--teal)' }}> · tap for brief</span>
                )}
              </p>
            </div>
            {brief && !briefLoading && (
              <span
                className="hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline"
                style={{
                  borderColor: 'rgba(15,110,86,0.25)',
                  background: 'var(--teal-light, #e8f5f0)',
                  color: 'var(--teal)',
                }}
              >
                Brief
              </span>
            )}
          </motion.button>
        ) : (
          <>
            <PeerAvatar name={displayName} url={peer?.avatar_url ?? null} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {displayName}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {peerSubtitle(peerIsAdvisor, viewerIsAdvisor)}
              </p>
            </div>
          </>
        )}
        <Link href={viewerIsAdvisor ? '/' : matchResultsHref()} className="hidden shrink-0 text-xs font-medium sm:inline" style={{ color: 'var(--teal)' }}>
          {viewerIsAdvisor ? 'Home' : 'Matches'}
        </Link>
      </header>

      {canOpenBrief && (
        <ClientBriefOverlay
          open={briefOpen}
          onClose={() => setBriefOpen(false)}
          brief={brief}
          loading={briefLoading}
          travelerName={displayName}
          travelerAvatarUrl={peer?.avatar_url ?? null}
        />
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(15,110,86,0.04) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(186,117,23,0.04) 0%, transparent 35%)',
        }}
      >
        {loading && (
          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            Loading messages…
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            {peerIsAdvisor === true
              ? 'Say hello — your advisor will reply here in real time.'
              : viewerIsAdvisor || peerIsAdvisor === false
                ? 'No messages yet. Reply here when your client reaches out.'
                : 'Say hello — start the conversation.'}
          </p>
        )}

        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {syncNotice && (
            <p
              className="rounded-xl border px-4 py-2.5 text-center text-xs leading-relaxed"
              style={{ borderColor: 'rgba(185,28,28,0.25)', background: '#fef2f2', color: '#b91c1c' }}
              role="alert"
            >
              {syncNotice}
            </p>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_id === currentUserId} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer
        className="shrink-0 border-t px-4 py-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {error && (
          <p className="mb-2 text-center text-xs" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Type a message"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)', background: 'var(--cream)' }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
          >
            Send
          </button>
        </form>
      </footer>
    </section>
    </LayoutGroup>
  )
}

function PeerAvatar({
  name,
  url,
  layoutId,
}: {
  name: string
  url: string | null
  layoutId?: string
}) {
  const initial = name.charAt(0).toUpperCase()
  if (url) {
    return (
      <motion.img
        layoutId={layoutId}
        src={url}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
      />
    )
  }
  return (
    <motion.div
      layoutId={layoutId}
      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ background: 'var(--teal)' }}
    >
      {initial}
    </motion.div>
  )
}
