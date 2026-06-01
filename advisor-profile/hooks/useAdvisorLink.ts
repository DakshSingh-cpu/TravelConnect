'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type AdvisorLink = {
  advisorRouteId: string
  customBio: string | null
  customVideoUrl: string | null
}

type State = {
  advisorLink: AdvisorLink | null
  loading: boolean
}

/**
 * Returns advisor profile link for the currently logged-in user, if any.
 * Used to determine if the logged-in user is a Travel Advisor.
 */
export function useAdvisorLink(userId: string | null): State {
  const [state, setState] = useState<State>({ advisorLink: null, loading: true })

  useEffect(() => {
    if (!userId) {
      setState({ advisorLink: null, loading: false })
      return
    }

    let cancelled = false
    const supabase = createClient()

    void (async () => {
      const { data, error } = await supabase
        .from('advisor_user_links')
        .select('advisor_route_id, custom_bio, custom_video_url')
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        setState({ advisorLink: null, loading: false })
        return
      }

      setState({
        advisorLink: {
          advisorRouteId: data.advisor_route_id,
          customBio: (data as Record<string, unknown>).custom_bio as string | null ?? null,
          customVideoUrl: (data as Record<string, unknown>).custom_video_url as string | null ?? null,
        },
        loading: false,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  return state
}
