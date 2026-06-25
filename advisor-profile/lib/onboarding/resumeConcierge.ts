import type { MatchIntakePayload } from '@/lib/intakeValidation'
import type { OnboardingPayload } from '@/lib/onboarding/schema'
import type { OnboardingContext } from '@/lib/conciergePrompt'

const HANDOFF_KEY = 'tbo_concierge_handoff'

export type ConciergeHandoff = {
  intake: MatchIntakePayload
  context: OnboardingContext
}

export function persistConciergeHandoff(
  intake: MatchIntakePayload,
  payload: OnboardingPayload,
): void {
  if (typeof window === 'undefined') return
  try {
    const handoff: ConciergeHandoff = {
      intake,
      context: { payload },
    }
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff))
  } catch {
    /* ignore */
  }
}

export function readConciergeHandoff(): ConciergeHandoff | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ConciergeHandoff
  } catch {
    return null
  }
}

export function clearConciergeHandoff(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}

/** Session flag: user finished onboarding and should land on the AI concierge. */
export const RESUME_CONCIERGE_KEY = 'tbo_resume_concierge'

export function markConciergeResumePending(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(RESUME_CONCIERGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearConciergeResumePending(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(RESUME_CONCIERGE_KEY)
  } catch {
    /* ignore */
  }
}

export function shouldResumeConciergeFromOnboarding(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('from') === 'onboarding') return true
  if (sessionStorage.getItem(RESUME_CONCIERGE_KEY) === '1') return true
  return readConciergeHandoff() !== null
}
