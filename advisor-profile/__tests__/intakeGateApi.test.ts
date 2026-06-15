import { describe, it, expect } from 'vitest'
import { rejectIfInvalidIntake, intakeGateJsonBody } from '@/lib/guardrails/intakeGate'
import { INTAKE_FIELD_DEFAULTS } from '@/lib/guardrails/constants'

describe('rejectIfInvalidIntake', () => {
  it('returns null for valid intake body', () => {
    const result = rejectIfInvalidIntake(
      {
        destination: 'Japan',
        budgetLakh: 15,
        travelStyle: 'Couple',
        ...INTAKE_FIELD_DEFAULTS,
      },
      '/api/match-advisors',
    )
    expect(result).toBeNull()
  })

  it('returns 422 JSON for blocked destination', async () => {
    const result = rejectIfInvalidIntake(
      {
        destination: 'Surprise me',
        budgetLakh: 15,
        travelStyle: 'Couple',
        ...INTAKE_FIELD_DEFAULTS,
      },
      '/api/match-advisors',
    )
    expect(result).not.toBeNull()
    expect(result?.status).toBe(422)
    const body = await result!.json()
    expect(body.blocked).toBe(true)
    expect(body.code).toBe('INTAKE_BLOCKED')
    expect(body.blockedField).toBe('destination')
    expect(typeof body.message).toBe('string')
  })
})

describe('intakeGateJsonBody', () => {
  it('shapes consistent API payload', () => {
    const body = intakeGateJsonBody({
      valid: false,
      code: 'INTAKE_BLOCKED',
      blockedField: 'budget',
      message: 'Budget too low',
    })
    expect(body).toEqual({
      blocked: true,
      code: 'INTAKE_BLOCKED',
      blockedField: 'budget',
      message: 'Budget too low',
    })
  })
})
