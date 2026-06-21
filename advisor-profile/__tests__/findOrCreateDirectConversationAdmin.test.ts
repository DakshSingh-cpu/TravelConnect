import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { findExistingDirectConversationAdmin } from '@/lib/chat/findOrCreateDirectConversationAdmin'

const ADVISOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TRAVELLER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const THIRD = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function buildAdmin(options: {
  participants: { conversation_id: string; user_id: string }[]
  counts: Record<string, number>
  latestId?: string
}): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'conversation_participants') {
      return {
        select: vi.fn((cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) {
            return {
              eq: vi.fn((_col: string, convId: string) =>
                Promise.resolve({ count: options.counts[convId] ?? 0, error: null }),
              ),
            }
          }
          return {
            in: vi.fn(() => Promise.resolve({ data: options.participants, error: null })),
          }
        }),
      }
    }

    if (table === 'conversations') {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({ data: options.latestId ? { id: options.latestId } : null, error: null }),
                ),
              })),
            })),
          })),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { from } as unknown as SupabaseClient
}

describe('findExistingDirectConversationAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the 1:1 conversation when both users participate', async () => {
    const convId = '11111111-1111-1111-1111-111111111111'
    const admin = buildAdmin({
      participants: [
        { conversation_id: convId, user_id: ADVISOR },
        { conversation_id: convId, user_id: TRAVELLER },
      ],
      counts: { [convId]: 2 },
    })

    const result = await findExistingDirectConversationAdmin(admin, ADVISOR, TRAVELLER)
    expect(result).toBe(convId)
  })

  it('ignores group chats that include both users', async () => {
    const groupId = '22222222-2222-2222-2222-222222222222'
    const admin = buildAdmin({
      participants: [
        { conversation_id: groupId, user_id: ADVISOR },
        { conversation_id: groupId, user_id: TRAVELLER },
        { conversation_id: groupId, user_id: THIRD },
      ],
      counts: { [groupId]: 3 },
    })

    const result = await findExistingDirectConversationAdmin(admin, ADVISOR, TRAVELLER)
    expect(result).toBeNull()
  })

  it('prefers the thread with more messages when duplicates exist', async () => {
    const older = '33333333-3333-3333-3333-333333333333'
    const newer = '44444444-4444-4444-4444-444444444444'

    const from = vi.fn((table: string) => {
      if (table === 'conversation_participants') {
        return {
          select: vi.fn((cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: vi.fn(() => Promise.resolve({ count: 2, error: null })),
              }
            }
            return {
              in: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { conversation_id: older, user_id: ADVISOR },
                    { conversation_id: older, user_id: TRAVELLER },
                    { conversation_id: newer, user_id: ADVISOR },
                    { conversation_id: newer, user_id: TRAVELLER },
                  ],
                  error: null,
                }),
              ),
            }
          }),
        }
      }
      if (table === 'conversations') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: older, updated_at: '2026-06-10T00:00:00Z', status: 'active' },
                    { id: newer, updated_at: '2026-06-19T00:00:00Z', status: 'active' },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        }
      }
      if (table === 'messages') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_col: string, convId: string) =>
              Promise.resolve({ count: convId === older ? 5 : 0, error: null }),
            ),
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const admin = { from } as unknown as SupabaseClient
    const result = await findExistingDirectConversationAdmin(admin, ADVISOR, TRAVELLER)
    expect(result).toBe(older)
  })
})
