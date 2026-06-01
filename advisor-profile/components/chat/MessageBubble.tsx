'use client'

import type { ChatMessage } from '@/lib/chat/types'

type Props = {
  message: ChatMessage
  isOwn: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[min(72%,28rem)] rounded-2xl px-3.5 py-2 shadow-sm"
        style={
          isOwn
            ? {
                background: 'linear-gradient(135deg, var(--teal), #0a5a46)',
                color: '#ffffff',
                borderBottomRightRadius: '0.35rem',
              }
            : {
                background: 'var(--surface)',
                color: 'var(--ink)',
                border: '1px solid var(--border)',
                borderBottomLeftRadius: '0.35rem',
              }
        }
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
        <p
          className="mt-1 text-[10px] text-right"
          style={{ color: isOwn ? 'rgba(255,255,255,0.75)' : 'var(--muted)' }}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}
