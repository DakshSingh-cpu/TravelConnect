import type { AdvisorBrief } from '@/lib/advisorBrief'
import { advisorBriefSchema } from '@/lib/advisorBrief'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import type { Attribution } from '@/lib/attribution'
import { readAttribution } from '@/lib/attribution'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import { parseIntakeBody } from '@/lib/matchAdvisors'

export const MATCH_RESULTS_STORAGE_KEY = 'tbo_match_results'
export const MATCH_SESSION_ID_STORAGE_KEY = 'tbo_match_session_id'

export type MatchSessionSnapshot = {
  advisors: EnrichedMatchedAdvisor[]
  intake: MatchIntakePayload
  advisorBrief?: AdvisorBrief | null
  attribution?: Attribution | null
  matchSessionId?: string | null
}

export function persistMatchSession(
  advisors: EnrichedMatchedAdvisor[],
  intake: MatchIntakePayload,
  advisorBrief?: AdvisorBrief | null,
): void {
  if (typeof window === 'undefined') return
  try {
    const attribution = readAttribution()
    const snapshot: MatchSessionSnapshot = {
      advisors,
      intake,
      advisorBrief: advisorBrief ?? null,
      attribution: attribution ?? null,
    }
    sessionStorage.setItem(MATCH_RESULTS_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore quota / private mode */
  }
}

export function persistMatchSessionId(matchSessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(MATCH_SESSION_ID_STORAGE_KEY, matchSessionId)
    localStorage.setItem(MATCH_SESSION_ID_STORAGE_KEY, matchSessionId)
  } catch {
    /* ignore */
  }
}

export function readMatchSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const fromSession = sessionStorage.getItem(MATCH_SESSION_ID_STORAGE_KEY)
    if (fromSession && fromSession.length > 0) return fromSession

    const fromLocal = localStorage.getItem(MATCH_SESSION_ID_STORAGE_KEY)
    if (fromLocal && fromLocal.length > 0) {
      sessionStorage.setItem(MATCH_SESSION_ID_STORAGE_KEY, fromLocal)
      return fromLocal
    }
    return null
  } catch {
    return null
  }
}

function slimAdvisorsForApi(advisors: EnrichedMatchedAdvisor[]) {
  return advisors.map((a) => ({ id: a.id, csvAgencyId: a.csvAgencyId }))
}

/** Persist match results to DB and store the session id for lead requests. */
export async function saveMatchSession(
  advisors: EnrichedMatchedAdvisor[],
  intake: MatchIntakePayload,
  brief?: AdvisorBrief | null,
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const existingId = readMatchSessionId()
  if (existingId) return existingId

  try {
    const attribution = readAttribution()
    const res = await fetch('/api/match-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advisors: slimAdvisorsForApi(advisors),
        intake,
        attribution,
        advisorBrief: brief ?? undefined,
      }),
    })

    const data = (await res.json()) as { ok?: boolean; matchSessionId?: string }
    if (data.ok && data.matchSessionId) {
      persistMatchSessionId(data.matchSessionId)
      return data.matchSessionId
    }
  } catch {
    /* lead request retries via ensureMatchSessionSaved / server fallback */
  }

  return null
}

/** Backfill DB session when results exist in sessionStorage but id was never saved. */
export async function ensureMatchSessionSaved(): Promise<string | null> {
  const existingId = readMatchSessionId()
  if (existingId) return existingId

  const session = readMatchSession()
  if (!session) return null

  return saveMatchSession(session.advisors, session.intake, session.advisorBrief)
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

    const matchSessionId =
      typeof o.matchSessionId === 'string' && o.matchSessionId.length > 0
        ? o.matchSessionId
        : readMatchSessionId()

    return {
      advisors: o.advisors as EnrichedMatchedAdvisor[],
      intake,
      advisorBrief,
      matchSessionId,
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

/** Wipe all match-related session data. Call this on sign-out so the next
 *  visitor does not see a previous traveller's journey. */
export function clearMatchSession(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(MATCH_RESULTS_STORAGE_KEY)
    sessionStorage.removeItem(MATCH_SESSION_ID_STORAGE_KEY)
    localStorage.removeItem(MATCH_SESSION_ID_STORAGE_KEY)
    // Also clear adjacent keys written during the flow
    sessionStorage.removeItem('tbo_match_intake')
    sessionStorage.removeItem('tbo_advisor_brief')
    sessionStorage.removeItem('pending_chat_advisor_id')
    // Clear concierge chat history so the next user starts a fresh conversation
    sessionStorage.removeItem('tbo_concierge_messages')
    // Clear background telemetry (typing rhythm, session time, paste detection)
    sessionStorage.removeItem('tbo_session_telemetry')
    // Clear the verified ZIP code captured during phone verification
    sessionStorage.removeItem('tbo_residential_zip')
  } catch {
    /* ignore */
  }
}

export const MATCH_RESULTS_VIEW = 'results'

/** Home URL that restores the top-3 advisor cards step. */
export function matchResultsHref(): string {
  return `/?view=${MATCH_RESULTS_VIEW}`
}
