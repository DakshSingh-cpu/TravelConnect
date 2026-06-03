'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  applyAccountRoleIntentIfNeeded,
  fetchMyAccountRole,
  type AccountRole,
} from '@/lib/accountRole'

type State = {
  accountRole: AccountRole | null
  loading: boolean
}

/**
 * Loads the immutable account role for the signed-in user.
 */
export function useAccountRole(userId: string | null): State & { refresh: () => void } {
  const [state, setState] = useState<State>({ accountRole: null, loading: Boolean(userId) })

  const load = useCallback(async () => {
    if (!userId) {
      setState({ accountRole: null, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true }))
    const role = await applyAccountRoleIntentIfNeeded()
    setState({ accountRole: role, loading: false })
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, refresh: load }
}
