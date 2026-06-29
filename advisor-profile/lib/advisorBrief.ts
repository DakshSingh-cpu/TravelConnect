import { z } from 'zod'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import {
  DEFAULT_READINESS_SCORE,
  DEFAULT_READINESS_TIER,
} from '@/lib/guardrails/constants'

export const readinessTierSchema = z.enum(['hot', 'warm', 'nurture', 'blocked'])
export type ReadinessTier = z.infer<typeof readinessTierSchema>

export const advisorBriefSchema = z.object({
  tldr: z.string().describe('Two sentence summary for the human advisor'),
  hard_constraints: z.object({
    budget: z.string(),
    dates: z.string(),
    pax: z.number().nullable().optional(),
  }),
  key_decisions: z.array(z.string()),
  advisor_action_items: z.array(z.string()),
  readiness_score: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .default(DEFAULT_READINESS_SCORE)
    .describe(
      'Lead readiness score 0–100. 75+ = hot. 58–74 = warm. 42–57 = nurture. Below 42 = blocked.',
    ),
  readiness_tier: readinessTierSchema
    .default(DEFAULT_READINESS_TIER)
    .describe('Tier derived from readiness_score'),
  low_intent_signals: z
    .array(z.string())
    .max(3)
    .default([])
    .describe('Signals that reduced the score'),
  // Server-issued HMAC over (readiness_score, readiness_tier), set by
  // /api/synthesize-brief. Lets downstream match endpoints trust the readiness
  // they receive instead of accepting a client-forgeable number. Optional so
  // legacy/fallback briefs and the LLM schema output remain valid.
  readiness_sig: z.string().optional(),
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
    readiness_score: DEFAULT_READINESS_SCORE,
    readiness_tier: DEFAULT_READINESS_TIER,
    low_intent_signals: [],
  }
}

export function parseAdvisorBrief(raw: unknown): AdvisorBrief | null {
  const parsed = advisorBriefSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
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
    return parseAdvisorBrief(JSON.parse(raw))
  } catch {
    return null
  }
}
