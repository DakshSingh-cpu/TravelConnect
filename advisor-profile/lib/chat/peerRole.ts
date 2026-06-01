import { createClient } from '@/lib/supabase/client'

/** True if this auth user is linked to a public advisor profile (agency route). */
export async function isLinkedTravelAdvisor(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('advisor_user_links')
    .select('advisor_route_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[peerRole]', error.message)
    return false
  }

  return Boolean(data?.advisor_route_id)
}
