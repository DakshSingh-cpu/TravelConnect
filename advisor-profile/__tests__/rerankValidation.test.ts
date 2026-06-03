import { describe, it, expect } from 'vitest'
import { validateRerankResult } from '@/lib/rerankValidation'

const allowlist = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1010]

describe('validateRerankResult', () => {
  it('passes with a valid result', () => {
    const result = validateRerankResult(
      {
        ranked_ids: [303, 101, 707],
        pitches: [
          { agency_id: 303, pitch: 'Great for families' },
          { agency_id: 101, pitch: 'Budget friendly' },
          { agency_id: 707, pitch: 'Luxury expert' },
        ],
      },
      allowlist,
      3,
    )
    expect(result.valid).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('fails on duplicate IDs in ranked_ids', () => {
    const result = validateRerankResult(
      {
        ranked_ids: [303, 303, 707],
        pitches: [
          { agency_id: 303, pitch: 'Great' },
          { agency_id: 303, pitch: 'Also great' },
          { agency_id: 707, pitch: 'Expert' },
        ],
      },
      allowlist,
      3,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Duplicate')
  })

  it('fails when a ranked ID is not in the allowlist (hallucinated)', () => {
    const result = validateRerankResult(
      {
        ranked_ids: [303, 101, 99999],
        pitches: [
          { agency_id: 303, pitch: 'Great' },
          { agency_id: 101, pitch: 'Good' },
          { agency_id: 99999, pitch: 'Fake agency' },
        ],
      },
      allowlist,
      3,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('99999')
  })

  it('fails when ranked_ids count does not match expected', () => {
    const result = validateRerankResult(
      {
        ranked_ids: [303, 101],
        pitches: [
          { agency_id: 303, pitch: 'Great' },
          { agency_id: 101, pitch: 'Good' },
        ],
      },
      allowlist,
      3,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Expected 3')
  })

  it('fails when a pitch is missing for a ranked ID', () => {
    const result = validateRerankResult(
      {
        ranked_ids: [303, 101, 707],
        pitches: [
          { agency_id: 303, pitch: 'Great' },
          { agency_id: 101, pitch: 'Good' },
          { agency_id: 505, pitch: 'Wrong ID' },
        ],
      },
      allowlist,
      3,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('707')
  })

  it('fails when pitches count does not match expected', () => {
    const result = validateRerankResult(
      {
        ranked_ids: [303, 101, 707],
        pitches: [
          { agency_id: 303, pitch: 'Great' },
          { agency_id: 101, pitch: 'Good' },
        ],
      },
      allowlist,
      3,
    )
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Expected 3 pitches')
  })
})
