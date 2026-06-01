'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchMessages, sendMessage as sendMessageApi } from '@/lib/chat/messages'
import type { ChatMessage } from '@/lib/chat/types'

export function useChatMessages(conversationId: string | null, currentUserId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(Boolean(conversationId))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appendUnique = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev
      return [...prev, incoming]
    })
  }, [])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const history = await fetchMessages(conversationId)
        if (!cancelled) {
          setMessages(history)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load messages')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`custom-insert-channel-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          appendUnique(payload.new as ChatMessage)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, appendUnique])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !currentUserId) return

      setSending(true)
      setError(null)

      try {
        const created = await sendMessageApi(conversationId, text, currentUserId)
        appendUnique(created)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
        throw err
      } finally {
        setSending(false)
      }
    },
    [conversationId, currentUserId, appendUnique],
  )

  return { messages, loading, sending, error, sendMessage }
}
