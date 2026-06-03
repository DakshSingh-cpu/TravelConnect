import { useEffect, useState } from 'react'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { fetchConversationBrief } from '@/lib/chat/conversationBrief'

/**
 * Fetches the traveller's AdvisorBrief for a given conversation.
 * Only fetches when the viewer is an advisor — returns null immediately for travellers.
 */
export function useConversationBrief(
  conversationId: string | null,
  viewerIsAdvisor: boolean,
) {
  const [brief, setBrief] = useState<AdvisorBrief | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conversationId || !viewerIsAdvisor) {
      setBrief(null)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchConversationBrief(conversationId).then((result) => {
      if (!cancelled) {
        setBrief(result)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [conversationId, viewerIsAdvisor])

  return { brief, loading }
}
