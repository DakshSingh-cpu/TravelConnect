import type { LeadRequestResult } from '@/lib/leads/types'
import { readAdvisorBrief } from '@/lib/advisorBrief'
import { ensureMatchSessionSaved, readMatchSession } from '@/lib/matchSession'
import { readResidentialZip, readSessionTelemetry } from '@/lib/telemetry/collector'

export async function requestLeadAssignment(
  advisorRouteId: string,
): Promise<LeadRequestResult> {
  const matchSessionId = await ensureMatchSessionSaved()
  const session = readMatchSession()
  const advisorIds =
    session?.advisors
      .map((a) => a.csvAgencyId)
      .filter((id): id is number => typeof id === 'number' && id > 0) ?? []

  const telemetry = readSessionTelemetry()
  const residentialZip = readResidentialZip()
  const advisorBrief = readAdvisorBrief()

  const res = await fetch('/api/leads/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      advisorRouteId,
      matchSessionId,
      intake: session?.intake,
      advisorIds,
      telemetry,
      residentialZip,
      advisorBrief,
    }),
  })

  const data = await res.json()

  if (!res.ok && !data.ok) {
    return {
      ok: false,
      error: data.error ?? 'Lead request failed',
      code: data.code,
    }
  }

  return data as LeadRequestResult
}
