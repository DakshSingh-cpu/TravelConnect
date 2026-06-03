import { useEffect, useState } from 'react'
import { syncSessionBriefToConversation } from '@/lib/chat/conversationBrief'

const SYNC_FAILED_MESSAGE =
  'Could not save your trip brief for your advisor. Try opening chat from your match results again.'

/**
 * When a traveller opens an existing conversation, persist sessionStorage brief if missing in DB.
 */
export function useTravellerBriefSync(conversationId: string | null, enabled: boolean) {
  const [syncNotice, setSyncNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId || !enabled) {
      setSyncNotice(null)
      return
    }

    let cancelled = false

    void syncSessionBriefToConversation(conversationId).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setSyncNotice(SYNC_FAILED_MESSAGE)
      } else {
        setSyncNotice(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [conversationId, enabled])

  return { syncNotice }
}
