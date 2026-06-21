import { describe, it, expect } from 'vitest'
import { pickCanonicalConversationId } from '@/lib/chat/mergeDuplicateConversations'

describe('pickCanonicalConversationId', () => {
  it('prefers the thread with more messages', () => {
    const id = pickCanonicalConversationId([
      { id: 'a', updated_at: '2026-06-19T00:00:00Z', messageCount: 1 },
      { id: 'b', updated_at: '2026-06-10T00:00:00Z', messageCount: 17 },
    ])
    expect(id).toBe('b')
  })

  it('tie-breaks on updated_at when message counts match', () => {
    const id = pickCanonicalConversationId([
      { id: 'a', updated_at: '2026-06-10T00:00:00Z', messageCount: 2 },
      { id: 'b', updated_at: '2026-06-19T00:00:00Z', messageCount: 2 },
    ])
    expect(id).toBe('b')
  })
})
