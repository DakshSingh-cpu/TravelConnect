import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdvisorBrief, ReadinessTier } from '@/lib/advisorBrief'
import { parseAdvisorBrief } from '@/lib/advisorBrief'
import type { Attribution } from '@/lib/attribution'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import { requireValidIntake } from '@/lib/guardrails/intakeGate'
import { deriveReadinessTier, normalizeAdvisorBrief } from '@/lib/guardrails/readiness'
import { enforceTrustedReadiness } from '@/lib/vetting/readinessSignature'
import { DEFAULT_READINESS_SCORE, DEFAULT_READINESS_TIER } from '@/lib/guardrails/constants'

export type CreateMatchSessionInput = {
  intake: MatchIntakePayload
  advisorIds: number[]
  advisorBrief?: AdvisorBrief | unknown
  attribution?: Attribution | null
  /** Optional client-supplied key to dedupe retried funnel submissions. */
  idempotencyKey?: string | null
}

export type InsertMatchSessionResult = {
  id: string
  readinessTier: ReadinessTier
}

/** Insert a match_sessions row and return its id + readiness tier, or null on failure. */
export async function insertMatchSession(
  supabaseAdmin: SupabaseClient,
  input: CreateMatchSessionInput,
): Promise<InsertMatchSessionResult | null> {
  const intakeResult = requireValidIntake(input.intake, 'insertMatchSession')
  if ('response' in intakeResult) return null
  const validatedIntake = intakeResult.intake

  const parsedBrief = input.advisorBrief ? parseAdvisorBrief(input.advisorBrief) : null
  const normalizedBrief = parsedBrief
    ? normalizeAdvisorBrief(enforceTrustedReadiness(parsedBrief), validatedIntake)
    : null

  const readinessScore = normalizedBrief?.readiness_score ?? DEFAULT_READINESS_SCORE
  const readinessTier = normalizedBrief
    ? deriveReadinessTier(normalizedBrief.readiness_score)
    : DEFAULT_READINESS_TIER

  const advisorIds = input.advisorIds.filter((id) => typeof id === 'number' && id > 0)
  const attribution = input.attribution
  const idempotencyKey = input.idempotencyKey?.trim() || null

  // Idempotency: if a prior submission used the same key, return it instead of
  // creating a duplicate funnel row.
  if (idempotencyKey) {
    const { data: existing } = await supabaseAdmin
      .from('match_sessions')
      .select('id, readiness_tier')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (existing) {
      return {
        id: existing.id,
        readinessTier: (existing.readiness_tier as ReadinessTier | null) ?? readinessTier,
      }
    }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('match_sessions')
    .insert({
      destination: validatedIntake.destination,
      budget_lakh: validatedIntake.budgetLakh,
      travel_style: validatedIntake.travelStyle,
      vibe: validatedIntake.vibe,
      pace: validatedIntake.pace,
      timing: validatedIntake.timing,
      duration: validatedIntake.duration,
      advisor_ids: advisorIds.length > 0 ? advisorIds : null,
      readiness_score: readinessScore,
      readiness_tier: readinessTier,
      low_intent_signals: normalizedBrief?.low_intent_signals ?? [],
      utm_source: attribution?.utm_source ?? null,
      utm_medium: attribution?.utm_medium ?? null,
      utm_campaign: attribution?.utm_campaign ?? null,
      utm_content: attribution?.utm_content ?? null,
      fbclid: attribution?.fbclid ?? null,
      landed_at: attribution?.landed_at ? new Date(attribution.landed_at) : null,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    // A concurrent request with the same key may have won the race — recover by
    // returning the existing row instead of failing.
    if (idempotencyKey) {
      const { data: raced } = await supabaseAdmin
        .from('match_sessions')
        .select('id, readiness_tier')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (raced) {
        return {
          id: raced.id,
          readinessTier: (raced.readiness_tier as ReadinessTier | null) ?? readinessTier,
        }
      }
    }
    console.error('[insertMatchSession] Insert error:', error?.message)
    return null
  }

  return { id: inserted.id, readinessTier }
}
