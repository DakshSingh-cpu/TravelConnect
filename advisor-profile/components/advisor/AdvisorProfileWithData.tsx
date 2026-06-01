'use client'

import { useEffect, useState } from 'react'
import DetailedAdvisorProfile from '@/components/advisor/DetailedAdvisorProfile'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import { readAgentProfileFromSession } from '@/lib/matchSession'
import type { MatchedAdvisor } from '@/lib/matchAdvisors'
import { createClient } from '@/lib/supabase/client'

type Props = {
  persona: MatchedAdvisor
  csvAgencyId: number
  customBio?: string | null
  customVideoUrl?: string | null
}

export default function AdvisorProfileWithData({ persona, csvAgencyId, customBio, customVideoUrl }: Props) {
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(() =>
    readAgentProfileFromSession(persona.id),
  )

  useEffect(() => {
    if (agentProfile) return

    let cancelled = false
    fetch(`/api/agency-profile?agencyId=${csvAgencyId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile?: AgentProfile | null } | null) => {
        if (!cancelled && data?.profile) setAgentProfile(data.profile)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [agentProfile, csvAgencyId, persona.id])

  // Also fetch custom profile overrides from Supabase (in real-time, client-side)
  const [liveCustomBio, setLiveCustomBio] = useState<string | null>(customBio ?? null)
  const [liveCustomVideoUrl, setLiveCustomVideoUrl] = useState<string | null>(customVideoUrl ?? null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    void supabase
      .from('advisor_user_links')
      .select('custom_bio, custom_video_url')
      .eq('advisor_route_id', persona.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        const d = data as Record<string, unknown>
        setLiveCustomBio((d.custom_bio as string | null) ?? null)
        setLiveCustomVideoUrl((d.custom_video_url as string | null) ?? null)
      })

    return () => {
      cancelled = true
    }
  }, [persona.id])

  return (
    <DetailedAdvisorProfile
      persona={persona}
      agentProfile={agentProfile}
      customBio={liveCustomBio}
      customVideoUrl={liveCustomVideoUrl}
    />
  )
}
