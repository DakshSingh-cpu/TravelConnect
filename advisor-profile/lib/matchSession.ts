import type { AdvisorBrief } from '@/lib/advisorBrief'
import { advisorBriefSchema } from '@/lib/advisorBrief'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import { parseIntakeBody } from '@/lib/matchAdvisors'

export const MATCH_RESULTS_STORAGE_KEY = 'tbo_match_results'

export type MatchSessionSnapshot = {
  advisors: EnrichedMatchedAdvisor[]
  intake: MatchIntakePayload
  advisorBrief?: AdvisorBrief | null
}

export function persistMatchSession(
  advisors: EnrichedMatchedAdvisor[],
  intake: MatchIntakePayload,
  advisorBrief?: AdvisorBrief | null,
): void {
  if (typeof window === 'undefined') return
  try {
    const snapshot: MatchSessionSnapshot = { advisors, intake, advisorBrief: advisorBrief ?? null }
    sessionStorage.setItem(MATCH_RESULTS_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readMatchSession(): MatchSessionSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(MATCH_RESULTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null

    const o = parsed as Record<string, unknown>
    if (!Array.isArray(o.advisors) || o.advisors.length === 0) return null

    const intake = parseIntakeBody(o.intake)
    if (!intake) return null

    let advisorBrief: AdvisorBrief | null = null
    if (o.advisorBrief != null) {
      const briefParsed = advisorBriefSchema.safeParse(o.advisorBrief)
      if (briefParsed.success) advisorBrief = briefParsed.data
    }

    return {
      advisors: o.advisors as EnrichedMatchedAdvisor[],
      intake,
      advisorBrief,
    }
  } catch {
    return null
  }
}

/** Agent profile already loaded during matching — avoids a second full CSV scan. */
export function readAgentProfileFromSession(advisorId: string): AgentProfile | null {
  const session = readMatchSession()
  if (!session) return null
  return session.advisors.find((a) => a.id === advisorId)?.agentProfile ?? null
}

export const MATCH_RESULTS_VIEW = 'results'

/** Home URL that restores the top-3 advisor cards step. */
export function matchResultsHref(): string {
  return `/?view=${MATCH_RESULTS_VIEW}`
}
