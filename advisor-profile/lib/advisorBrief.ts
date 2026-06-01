import { z } from 'zod'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'

export const advisorBriefSchema = z.object({
  tldr: z.string().describe('Two sentence summary for the human advisor'),
  hard_constraints: z.object({
    budget: z.string(),
    dates: z.string(),
    pax: z.number().nullable().optional(),
  }),
  key_decisions: z.array(z.string()),
  advisor_action_items: z.array(z.string()),
})

export type AdvisorBrief = z.infer<typeof advisorBriefSchema>

export const ADVISOR_BRIEF_STORAGE_KEY = 'tbo_advisor_brief'

export function buildFallbackBrief(
  intake: MatchIntakePayload,
  chatSummary?: string,
): AdvisorBrief {
  return {
    tldr:
      chatSummary?.trim() ||
      `Traveler wants a ${intake.vibe.toLowerCase()} ${intake.destination} trip (${intake.travelStyle}, ${intake.pace} pace) within ₹${intake.budgetLakh}L, planning ${intake.timing.toLowerCase()} for ${intake.duration.toLowerCase()}.`,
    hard_constraints: {
      budget: `₹${intake.budgetLakh} lakh`,
      dates: `${intake.timing} · ${intake.duration}`,
      pax: null,
    },
    key_decisions: [
      `Destination: ${intake.destination}`,
      `Travel style: ${intake.travelStyle}`,
      `Vibe: ${intake.vibe} · Pace: ${intake.pace}`,
    ],
    advisor_action_items: [
      'Confirm exact travel dates and party size',
      'Share 2–3 itinerary directions aligned with budget',
      'Offer a short intro call within 24 hours',
    ],
  }
}

export function persistAdvisorBrief(brief: AdvisorBrief): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(ADVISOR_BRIEF_STORAGE_KEY, JSON.stringify(brief))
  } catch {
    /* ignore */
  }
}

export function readAdvisorBrief(): AdvisorBrief | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ADVISOR_BRIEF_STORAGE_KEY)
    if (!raw) return null
    return advisorBriefSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
