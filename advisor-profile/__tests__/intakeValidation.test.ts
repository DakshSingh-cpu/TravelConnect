import { describe, it, expect } from 'vitest'
import { validateIntake, parseAndValidateIntake } from '@/lib/intakeValidation'
import { INTAKE_FIELD_DEFAULTS } from '@/lib/guardrails/constants'

const validBase = {
  destination: 'Japan',
  budgetLakh: 10,
  travelStyle: 'Luxury',
  ...INTAKE_FIELD_DEFAULTS,
}

describe('validateIntake — hard gates', () => {
  it('blocks blank destination', () => {
    const r = validateIntake({ ...validBase, destination: '' })
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('destination')
  })

  it('blocks generic destination "anywhere"', () => {
    const r = validateIntake({ ...validBase, destination: 'anywhere' })
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('destination')
  })

  it('blocks "Surprise me"', () => {
    const r = validateIntake({ ...validBase, destination: 'Surprise me' })
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('destination')
  })

  it('allows curated region Europe', () => {
    const r = validateIntake({ ...validBase, destination: 'Europe' })
    expect(r.valid).toBe(true)
  })

  it('allows Japan', () => {
    const r = validateIntake({ ...validBase, destination: 'Japan' })
    expect(r.valid).toBe(true)
  })

  it('blocks budget below ₹5L', () => {
    const r = validateIntake({ ...validBase, budgetLakh: 4.5 })
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('budget')
  })

  it('passes budget at ₹5L', () => {
    const r = validateIntake({ ...validBase, budgetLakh: 5 })
    expect(r.valid).toBe(true)
  })

  it('blocks missing travel style', () => {
    const r = validateIntake({ ...validBase, travelStyle: '' })
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('travelStyle')
  })

  it('blocks "Just dreaming" timing', () => {
    const r = validateIntake({ ...validBase, timing: 'Just dreaming' })
    expect(r.valid).toBe(false)
    expect(r.blockedField).toBe('timing')
  })

  it('passes a valid intake', () => {
    const r = validateIntake(validBase)
    expect(r.valid).toBe(true)
  })
})

describe('parseAndValidateIntake', () => {
  it('coerces string budget and validates', () => {
    const r = parseAndValidateIntake({
      destination: 'Bali',
      budgetLakh: '12',
      travelStyle: 'Couple',
      vibe: 'Culture',
      pace: 'Balanced',
      timing: 'Next 6 months',
      duration: '1-2 weeks',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.budgetLakh).toBe(12)
    }
  })

  it('rejects sub-minimum budget without silent clamping', () => {
    const r = parseAndValidateIntake({
      destination: 'Bali',
      budgetLakh: 2,
      travelStyle: 'Couple',
      ...INTAKE_FIELD_DEFAULTS,
    })
    expect(r.success).toBe(false)
  })
})
