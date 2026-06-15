import { NextResponse } from 'next/server'
import {
  parseAndValidateIntake,
  type IntakeValidationResult,
} from '@/lib/intakeValidation'
import type { MatchIntakePayload } from '@/lib/intakeValidation'

export type IntakeGateJsonBody = {
  blocked: true
  code: 'INTAKE_BLOCKED'
  blockedField?: IntakeValidationResult['blockedField']
  message: string
}

export function intakeGateJsonBody(result: IntakeValidationResult): IntakeGateJsonBody {
  return {
    blocked: true,
    code: 'INTAKE_BLOCKED',
    blockedField: result.blockedField,
    message: result.message ?? 'Please complete all trip details to continue.',
  }
}

export function rejectIfInvalidIntake(
  intakeBody: unknown,
  route: string,
): NextResponse | null {
  const validation = parseAndValidateIntake(intakeBody)
  if (validation.success) {
    return null
  }

  console.warn('[intake-gate]', {
    route,
    blockedField: validation.result.blockedField,
    code: 'INTAKE_BLOCKED',
  })

  return NextResponse.json(intakeGateJsonBody(validation.result), { status: 422 })
}

/** Returns validated intake or a 422 NextResponse — use in non-stream routes. */
export function requireValidIntake(
  intakeBody: unknown,
  route: string,
): { intake: MatchIntakePayload } | { response: NextResponse } {
  const validation = parseAndValidateIntake(intakeBody)
  if (!validation.success) {
    console.warn('[intake-gate]', {
      route,
      blockedField: validation.result.blockedField,
      code: 'INTAKE_BLOCKED',
    })
    return {
      response: NextResponse.json(intakeGateJsonBody(validation.result), { status: 422 }),
    }
  }
  return { intake: validation.data }
}
