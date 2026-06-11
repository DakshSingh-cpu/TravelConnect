'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { clearMatchSession } from '@/lib/matchSession'

type SessionState = {
  session: Session | null
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useSupabaseSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        clearMatchSession()
      }
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    user: session?.user ?? null,
    loading,
    refresh,
  }
}
