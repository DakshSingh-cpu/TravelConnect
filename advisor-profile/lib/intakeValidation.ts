import { z } from 'zod'
import {
  BLOCKED_DESTINATIONS,
  BLOCKED_TIMINGS,
  INTAKE_BLOCKED_MESSAGE_BUDGET,
  INTAKE_BLOCKED_MESSAGE_DESTINATION,
  INTAKE_BLOCKED_MESSAGE_TIMING,
  INTAKE_BLOCKED_MESSAGE_TRAVEL_STYLE,
  INTAKE_FIELD_DEFAULTS,
  MAX_BUDGET_LAKH,
  MIN_BUDGET_LAKH,
  MIN_DESTINATION_LENGTH,
} from '@/lib/guardrails/constants'

export type MatchIntakePayload = {
  destination: string
  budgetLakh: number
  travelStyle: string
  vibe: string
  pace: string
  timing: string
  duration: string
}

export type IntakeBlockedField = 'destination' | 'budget' | 'travelStyle' | 'timing'

export type IntakeValidationResult = {
  valid: boolean
  blockedField?: IntakeBlockedField
  message?: string
  code?: 'INTAKE_BLOCKED'
}

export const intakeSchema = z
  .object({
    destination: z
      .string()
      .trim()
      .min(MIN_DESTINATION_LENGTH, INTAKE_BLOCKED_MESSAGE_DESTINATION),
    budgetLakh: z
      .number()
      .min(MIN_BUDGET_LAKH, INTAKE_BLOCKED_MESSAGE_BUDGET)
      .max(MAX_BUDGET_LAKH, `Budget cannot exceed ₹${MAX_BUDGET_LAKH} lakh.`),
    travelStyle: z.string().trim().min(1, INTAKE_BLOCKED_MESSAGE_TRAVEL_STYLE),
    vibe: z.string().trim().min(1),
    pace: z.string().trim().min(1),
    timing: z.string().trim().min(1),
    duration: z.string().trim().min(1),
  })
  .superRefine((data, ctx) => {
    const dest = data.destination.toLowerCase()
    if (BLOCKED_DESTINATIONS.includes(dest as (typeof BLOCKED_DESTINATIONS)[number])) {
      ctx.addIssue({
        code: 'custom',
        path: ['destination'],
        message: INTAKE_BLOCKED_MESSAGE_DESTINATION,
      })
    }
    if (BLOCKED_TIMINGS.includes(data.timing as (typeof BLOCKED_TIMINGS)[number])) {
      ctx.addIssue({
        code: 'custom',
        path: ['timing'],
        message: INTAKE_BLOCKED_MESSAGE_TIMING,
      })
    }
  })

function trimStr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

/** Coerce a partial intake object (API body or session JSON) before Zod validation. */
export function coerceRawIntake(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const o = body as Record<string, unknown>

  const budgetRaw =
    typeof o.budgetLakh === 'number' && Number.isFinite(o.budgetLakh)
      ? o.budgetLakh
      : Number(o.budgetLakh)

  return {
    destination: typeof o.destination === 'string' ? o.destination : '',
    budgetLakh: Number.isFinite(budgetRaw) ? budgetRaw : NaN,
    travelStyle: typeof o.travelStyle === 'string' ? o.travelStyle : '',
    vibe: trimStr(o.vibe) ?? INTAKE_FIELD_DEFAULTS.vibe,
    pace: trimStr(o.pace) ?? INTAKE_FIELD_DEFAULTS.pace,
    timing: trimStr(o.timing) ?? INTAKE_FIELD_DEFAULTS.timing,
    duration: trimStr(o.duration) ?? INTAKE_FIELD_DEFAULTS.duration,
  }
}

const FIELD_PATH_MAP: Record<string, IntakeBlockedField> = {
  destination: 'destination',
  budgetLakh: 'budget',
  travelStyle: 'travelStyle',
  timing: 'timing',
}

export function zodErrorToIntakeResult(error: z.ZodError): IntakeValidationResult {
  const first = error.issues[0]
  const pathKey = first?.path[0]
  const blockedField =
    typeof pathKey === 'string' ? FIELD_PATH_MAP[pathKey] : undefined

  return {
    valid: false,
    code: 'INTAKE_BLOCKED',
    blockedField,
    message: first?.message ?? 'Please complete all trip details to continue.',
  }
}

export function parseAndValidateIntake(
  body: unknown,
):
  | { success: true; data: MatchIntakePayload }
  | { success: false; result: IntakeValidationResult } {
  const parsed = intakeSchema.safeParse(coerceRawIntake(body))
  if (parsed.success) {
    return { success: true, data: parsed.data }
  }
  return { success: false, result: zodErrorToIntakeResult(parsed.error) }
}

export function validateIntake(payload: MatchIntakePayload): IntakeValidationResult {
  const parsed = intakeSchema.safeParse(payload)
  if (parsed.success) {
    return { valid: true }
  }
  return zodErrorToIntakeResult(parsed.error)
}
