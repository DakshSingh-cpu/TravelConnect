import { createClient } from '@/lib/supabase/client'

/** Creates public.users row for the signed-in user if missing (post sign-in / before chat). */
export async function ensureMyProfile(): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('ensure_my_profile')
  if (error) {
    throw new Error(error.message)
  }
}

/** Same as ensureMyProfile but never throws (e.g. migration not applied yet). */
export async function ensureMyProfileOptional(): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('ensure_my_profile')
  if (error) {
    console.warn('[ensureMyProfile]', error.message)
  }
}
