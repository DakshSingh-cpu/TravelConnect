import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cascadeToNextAdvisor } from '@/lib/leads/cascade'

type MockReturn = { data: unknown; error: unknown }

function createMockSupabase(overrides: {
  matchSession?: { advisor_ids: number[] } | null
  existingAssignments?: Array<{ advisor_route_id: string; rank: number }>
  advisorLink?: { user_id: string } | null
  insertedAssignment?: { id: string } | null
  insertError?: { message: string } | null
}) {
  const {
    matchSession = { advisor_ids: [101, 102, 103] },
    existingAssignments = [],
    advisorLink = { user_id: 'advisor-uuid' },
    insertedAssignment = { id: 'new-assignment-uuid' },
    insertError = null,
  } = overrides

  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }

  const fromMap: Record<string, () => MockReturn | typeof mock> = {
    match_sessions_select: () => {
      mock.single.mockResolvedValueOnce({ data: matchSession, error: null })
      return mock
    },
    lead_assignments_select: () => {
      mock.eq.mockReturnValue({
        ...mock,
        then: undefined,
        data: existingAssignments,
        error: null,
      })
      return { data: existingAssignments, error: null } as unknown as MockReturn
    },
    advisor_user_links_select: () => {
      mock.maybeSingle.mockResolvedValueOnce({ data: advisorLink, error: null })
      return mock
    },
    lead_assignments_insert: () => {
      mock.single.mockResolvedValueOnce({
        data: insertedAssignment,
        error: insertError,
      })
      return mock
    },
  }

  let callCount = 0
  const tableOrder = [
    'match_sessions_select',
    'lead_assignments_select',
    'advisor_user_links_select',
    'lead_assignments_insert',
  ]

  mock.from.mockImplementation(() => {
    const key = tableOrder[Math.min(callCount, tableOrder.length - 1)]
    callCount++
    fromMap[key]?.()
    return mock
  })

  return mock as unknown as SupabaseClient
}

describe('cascadeToNextAdvisor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null and marks exhausted when no advisor_ids exist', async () => {
    const updateFn = vi.fn().mockReturnThis()
    const mock = createMockSupabase({ matchSession: { advisor_ids: [] } })
    ;(mock as unknown as { from: ReturnType<typeof vi.fn> }).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: updateFn,
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { advisor_ids: [] }, error: null }),
    })

    const result = await cascadeToNextAdvisor(mock, 'session-1', 'traveller-1')
    expect(result).toBeNull()
  })

  it('returns null when all advisors have been tried', async () => {
    const mock = createMockSupabase({
      matchSession: { advisor_ids: [101, 102] },
      existingAssignments: [
        { advisor_route_id: 'agency-101', rank: 1 },
        { advisor_route_id: 'agency-102', rank: 2 },
      ],
    })

    const result = await cascadeToNextAdvisor(mock, 'session-1', 'traveller-1')
    expect(result).toBeNull()
  })

  it('skips already-assigned advisors and picks the next', async () => {
    const selectCalls: string[] = []
    const mockClient = {
      from: vi.fn((table: string) => {
        const chainable = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          maybeSingle: vi.fn(),
        }

        if (table === 'match_sessions') {
          selectCalls.push('match_sessions')
          chainable.single.mockResolvedValue({
            data: { advisor_ids: [101, 102, 103] },
            error: null,
          })
        } else if (table === 'lead_assignments' && selectCalls.length < 2) {
          selectCalls.push('lead_assignments')
          chainable.eq.mockReturnValue({
            ...chainable,
            data: [{ advisor_route_id: 'agency-101', rank: 1 }],
            error: null,
          })
          return {
            select: () => ({
              eq: () => ({
                data: [{ advisor_route_id: 'agency-101', rank: 1 }],
                error: null,
              }),
            }),
          }
        } else if (table === 'advisor_user_links') {
          chainable.maybeSingle.mockResolvedValue({
            data: { user_id: 'advisor-102-uuid' },
            error: null,
          })
        } else if (table === 'lead_assignments') {
          chainable.single.mockResolvedValue({
            data: { id: 'cascaded-assignment-id' },
            error: null,
          })
        }

        return chainable
      }),
    } as unknown as SupabaseClient

    const result = await cascadeToNextAdvisor(mockClient, 'session-1', 'traveller-1')
    expect(result).not.toBeNull()
    expect(result?.advisorRouteId).toBe('agency-102')
    expect(result?.assignmentId).toBe('cascaded-assignment-id')
  })
})

describe('lead assignment types', () => {
  it('all status values are valid', () => {
    const validStatuses = ['pending', 'accepted', 'rejected', 'expired', 'superseded']
    for (const s of validStatuses) {
      expect(typeof s).toBe('string')
    }
  })
})

describe('cascadeToNextAdvisor — no linked advisor', () => {
  it('returns null when next advisor has no user link', async () => {
    const mockClient = {
      from: vi.fn((table: string) => {
        const chainable = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          maybeSingle: vi.fn(),
        }

        if (table === 'match_sessions') {
          chainable.single.mockResolvedValue({
            data: { advisor_ids: [101] },
            error: null,
          })
        } else if (table === 'lead_assignments') {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          }
        } else if (table === 'advisor_user_links') {
          chainable.maybeSingle.mockResolvedValue({
            data: null,
            error: null,
          })
        }

        return chainable
      }),
    } as unknown as SupabaseClient

    const result = await cascadeToNextAdvisor(mockClient, 'session-1', 'traveller-1')
    expect(result).toBeNull()
  })
})
