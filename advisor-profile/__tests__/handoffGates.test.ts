import { describe, it, expect } from 'vitest'
import {
  evaluateHandoffGate,
  EXPLICIT_OVERRIDE_REGEX,
} from '@/lib/handoffGates'

describe('EXPLICIT_OVERRIDE_REGEX', () => {
  it('matches "talk to a human"', () => {
    expect(EXPLICIT_OVERRIDE_REGEX.test('I want to talk to a human')).toBe(true)
  })

  it('matches "talk to human" without article', () => {
    expect(EXPLICIT_OVERRIDE_REGEX.test('talk to human please')).toBe(true)
  })

  it('matches "connect me with an advisor"', () => {
    expect(
      EXPLICIT_OVERRIDE_REGEX.test('Can you connect me with an advisor?'),
    ).toBe(true)
  })

  it('matches "speak to an advisor"', () => {
    expect(EXPLICIT_OVERRIDE_REGEX.test('I want to speak to an advisor')).toBe(
      true,
    )
  })

  it('does not match casual travel chat', () => {
    expect(EXPLICIT_OVERRIDE_REGEX.test('Tell me about Rome itineraries')).toBe(
      false,
    )
  })

  it('is case-insensitive', () => {
    expect(EXPLICIT_OVERRIDE_REGEX.test('TALK TO A HUMAN')).toBe(true)
  })
})

describe('evaluateHandoffGate', () => {
  it('accepts when override is true regardless of other fields', () => {
    const result = evaluateHandoffGate({
      override: true,
      confidence: 0.2,
      intent: 'exploring',
      userTurnCount: 1,
    })
    expect(result.accepted).toBe(true)
    expect(result.suggestedFollowUp).toBeUndefined()
  })

  it('rejects when confidence is below 0.75', () => {
    const result = evaluateHandoffGate({
      override: false,
      confidence: 0.5,
      intent: 'ready_to_book',
      userTurnCount: 5,
    })
    expect(result.accepted).toBe(false)
    expect(result.suggestedFollowUp).toBeTruthy()
    expect(result.reason).toContain('Confidence')
  })

  it('rejects when intent is exploring', () => {
    const result = evaluateHandoffGate({
      override: false,
      confidence: 0.9,
      intent: 'exploring',
      userTurnCount: 5,
    })
    expect(result.accepted).toBe(false)
    expect(result.reason).toContain('exploring')
  })

  it('rejects when user turn count is below 3', () => {
    const result = evaluateHandoffGate({
      override: false,
      confidence: 0.9,
      intent: 'ready_to_book',
      userTurnCount: 2,
    })
    expect(result.accepted).toBe(false)
    expect(result.reason).toContain('2')
  })

  it('accepts when all gates pass', () => {
    const result = evaluateHandoffGate({
      override: false,
      confidence: 0.9,
      intent: 'ready_to_book',
      userTurnCount: 5,
    })
    expect(result.accepted).toBe(true)
    expect(result.reason).toBe('All gates passed')
  })

  it('checks gates in priority order — confidence before intent', () => {
    const result = evaluateHandoffGate({
      override: false,
      confidence: 0.3,
      intent: 'exploring',
      userTurnCount: 1,
    })
    expect(result.accepted).toBe(false)
    expect(result.reason).toContain('Confidence')
  })
})
