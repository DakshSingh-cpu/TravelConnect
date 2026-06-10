'use client'

import Link from 'next/link'
import type { InboxConversation } from '@/lib/chat/types'

type Props = {
  inbox: InboxConversation[]
  activeConversationId: string | null
  loading: boolean
  isAdvisor?: boolean
}

function displayName(peer: InboxConversation['peer']) {
  return peer.full_name?.trim() || 'Advisor'
}

function previewText(item: InboxConversation) {
  if (!item.lastMessage) return 'No messages yet'
  const text = item.lastMessage.text
  return text.length > 48 ? `${text.slice(0, 48)}…` : text
}

function formatListTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ChatSidebar({ inbox, activeConversationId, loading, isAdvisor = false }: Props) {
  return (
    <aside
      className="flex h-full w-full flex-col border-r md:w-[340px] md:min-w-[300px] md:max-w-[38%]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="flex h-14 shrink-0 items-center justify-between border-b px-4"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
      >
        <h1 className="font-display text-lg" style={{ color: 'var(--teal)' }}>
          {isAdvisor ? 'Client inbox' : 'Messages'}
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <p className="px-4 py-6 text-sm" style={{ color: 'var(--muted)' }}>
            Loading conversations…
          </p>
        )}

        {!loading && inbox.length === 0 && (
          <p className="px-4 py-6 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {isAdvisor
              ? 'No client messages yet. When a traveller contacts you from your profile, conversations will appear here.'
              : 'No conversations yet. Use “Chat with…” on an advisor card to start.'}
          </p>
        )}

        <ul>
          {inbox.map((item) => {
            const active = item.id === activeConversationId
            return (
              <li key={item.id}>
                <Link
                  href={`/chat/${item.id}`}
                  className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-[rgba(15,110,86,0.05)]"
                  style={{
                    borderColor: 'var(--border)',
                    background: active ? 'rgba(15, 110, 86, 0.08)' : undefined,
                  }}
                >
                  <Avatar name={displayName(item.peer)} url={item.peer.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        {displayName(item.peer)}
                      </span>
                      <span className="shrink-0 text-[10px]" style={{ color: 'var(--muted)' }}>
                        {formatListTime(item.lastMessage?.created_at ?? item.updated_at)}
                      </span>
                    </div>
                    <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                      {previewText(item)}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initial = name.charAt(0).toUpperCase()
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
    )
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ background: 'var(--teal)' }}
    >
      {initial}
    </div>
  )
}
