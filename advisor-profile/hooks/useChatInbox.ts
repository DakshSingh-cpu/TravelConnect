'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchInbox } from '@/lib/chat/inbox'
import type { InboxConversation } from '@/lib/chat/types'

export function useChatInbox(currentUserId: string | null) {
  const [inbox, setInbox] = useState<InboxConversation[]>([])
  const [loading, setLoading] = useState(Boolean(currentUserId))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!currentUserId) {
      setInbox([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rows = await fetchInbox(currentUserId)
      setInbox(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!currentUserId) return

    const supabase = createClient()

    const channel = supabase
      .channel('custom-insert-channel-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          void reload()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, reload])

  return { inbox, loading, error, reload }
}
