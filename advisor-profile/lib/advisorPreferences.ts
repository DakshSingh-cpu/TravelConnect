import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

export interface AdvisorPreferences {
  min_readiness_score: number
  min_budget_lakh: number
  active_destinations: string[]
  accept_nurture_leads: boolean
}

export const ADVISOR_PREF_DEFAULTS: AdvisorPreferences = {
  min_readiness_score: 35,
  min_budget_lakh: 0,
  active_destinations: [],
  accept_nurture_leads: false,
}

export const advisorPreferencesSchema = z.object({
  min_readiness_score: z.coerce.number().int().min(0).max(100),
  min_budget_lakh: z.coerce.number().min(0).max(9999.99),
  active_destinations: z.array(z.string().trim().min(1)).default([]),
  accept_nurture_leads: z.boolean(),
})

export function validateAdvisorPreferences(
  prefs: Partial<AdvisorPreferences>,
): { success: true; data: AdvisorPreferences } | { success: false; error: string } {
  const merged = { ...ADVISOR_PREF_DEFAULTS, ...prefs }
  const result = advisorPreferencesSchema.safeParse(merged)
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? 'Invalid preferences' }
  }
  return { success: true, data: result.data }
}

export async function getAdvisorPreferences(userId: string): Promise<AdvisorPreferences> {
  const supabase = createClient()
  const { data } = await supabase
    .from('advisor_preferences')
    .select('min_readiness_score, min_budget_lakh, active_destinations, accept_nurture_leads')
    .eq('user_id', userId)
    .single()
  return data ?? { ...ADVISOR_PREF_DEFAULTS }
}

export async function saveAdvisorPreferences(
  userId: string,
  prefs: Partial<AdvisorPreferences>,
): Promise<{ error: string | null }> {
  const parsed = validateAdvisorPreferences(prefs)
  if (!parsed.success) {
    return { error: parsed.error }
  }

  const supabase = createClient()
  const { error } = await supabase.from('advisor_preferences').upsert({
    user_id: userId,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  })
  return { error: error?.message ?? null }
}
