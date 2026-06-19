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

export default function ChatSidebar({
  inbox,
  activeConversationId,
  loading,
  isAdvisor = false,
}: Props) {
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
          <p className="px-4 py-6 text-sm" style={{ color: 'var(--muted)' }}>
            No conversations yet.
          </p>
        )}

        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {inbox.map((item) => {
            const active = item.id === activeConversationId
            return (
              <li key={item.id}>
                <Link
                  href={`/chat/${item.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02]"
                  style={{
                    background: active ? 'var(--surface-2)' : undefined,
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ background: 'var(--teal)' }}
                  >
                    {displayName(item.peer).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: 'var(--ink)' }}
                      >
                        {displayName(item.peer)}
                      </p>
                      {item.lastMessage && (
                        <span className="shrink-0 text-[10px]" style={{ color: 'var(--muted)' }}>
                          {formatListTime(item.lastMessage.created_at)}
                        </span>
                      )}
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
