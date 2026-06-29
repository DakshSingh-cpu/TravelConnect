import type { AdvisorBrief, ReadinessTier } from '@/lib/advisorBrief'
import type { EnrichedMatchedAdvisor, MatchIntakePayload } from '@/lib/matchAdvisors'
import { withFunnelTokenHeader } from '@/lib/guardrails/funnelTokenClient'

export type GuardrailErrorCode = 'INTAKE_BLOCKED' | 'RATE_LIMITED' | 'READINESS_BLOCKED'

export class MatchGuardrailError extends Error {
  readonly code: GuardrailErrorCode

  constructor(message: string, code: GuardrailErrorCode) {
    super(message)
    this.name = 'MatchGuardrailError'
    this.code = code
  }
}

type GuardrailJson = {
  blocked?: boolean
  code?: GuardrailErrorCode
  message?: string
  blockReason?: string
}

export type MatchFetchResult = {
  advisors: EnrichedMatchedAdvisor[]
  readinessTier?: ReadinessTier
  readinessScore?: number
  isNurtureLead?: boolean
  lowIntentSignals?: string[]
}

export async function fetchMatchedAdvisors(
  payload: MatchIntakePayload,
  brief?: AdvisorBrief | null,
): Promise<MatchFetchResult> {
  const res = await fetch('/api/match-advisors', {
    method: 'POST',
    headers: await withFunnelTokenHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...payload, advisorBrief: brief ?? undefined }),
  })

  if (res.status === 422 || res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as GuardrailJson
    const code = body.code === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'INTAKE_BLOCKED'
    throw new MatchGuardrailError(
      body.message ?? 'Your trip details need a quick update before we can match advisors.',
      code,
    )
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error((errData as { error?: string }).error || 'match request failed')
  }

  const data = (await res.json()) as {
    advisors?: EnrichedMatchedAdvisor[]
    blocked?: boolean
    code?: GuardrailErrorCode
    blockReason?: string
    readinessTier?: ReadinessTier
    readinessScore?: number
    isNurtureLead?: boolean
    lowIntentSignals?: string[]
  }

  if (data.blocked && data.code === 'READINESS_BLOCKED') {
    throw new MatchGuardrailError(
      data.blockReason ??
        'We need a bit more trip detail before we can match you with an advisor.',
      'READINESS_BLOCKED',
    )
  }

  if (!Array.isArray(data.advisors)) {
    throw new Error('Unexpected match response')
  }

  return {
    advisors: data.advisors,
    readinessTier: data.readinessTier,
    readinessScore: data.readinessScore,
    isNurtureLead: data.isNurtureLead,
    lowIntentSignals: data.lowIntentSignals,
  }
}
