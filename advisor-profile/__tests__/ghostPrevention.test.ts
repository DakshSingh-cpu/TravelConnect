import { describe, it, expect } from 'vitest'
import {
  GHOST_REPLY_WINDOW_MS,
  isStaleGhostConversation,
  ghostArchiveCutoffIso,
} from '@/lib/guardrails/ghostPrevention'

const HOUR_MS = 60 * 60 * 1000
const NOW = Date.now()

function makeConv(overrides: Partial<{
  status: 'active' | 'archived' | 'completed'
  first_advisor_message_at: string | null
  traveller_replied_after_advisor: boolean | null
}> = {}) {
  return {
    status: 'active' as const,
    first_advisor_message_at: null,
    traveller_replied_after_advisor: null,
    ...overrides,
  }
}

describe('isStaleGhostConversation', () => {
  it('returns true when advisor messaged 49h ago with no traveller reply', () => {
    const conv = makeConv({
      first_advisor_message_at: new Date(NOW - 49 * HOUR_MS).toISOString(),
    })
    expect(isStaleGhostConversation(conv, NOW)).toBe(true)
  })

  it('returns false when advisor messaged only 24h ago', () => {
    const conv = makeConv({
      first_advisor_message_at: new Date(NOW - 24 * HOUR_MS).toISOString(),
    })
    expect(isStaleGhostConversation(conv, NOW)).toBe(false)
  })

  it('returns false at exactly the 48h boundary (not yet stale)', () => {
    const conv = makeConv({
      first_advisor_message_at: new Date(NOW - 48 * HOUR_MS + 1).toISOString(),
    })
    expect(isStaleGhostConversation(conv, NOW)).toBe(false)
  })

  it('returns true at exactly 48h', () => {
    const conv = makeConv({
      first_advisor_message_at: new Date(NOW - 48 * HOUR_MS).toISOString(),
    })
    expect(isStaleGhostConversation(conv, NOW)).toBe(true)
  })

  it('returns false when traveller has replied', () => {
    const conv = makeConv({
      first_advisor_message_at: new Date(NOW - 72 * HOUR_MS).toISOString(),
      traveller_replied_after_advisor: true,
    })
    expect(isStaleGhostConversation(conv, NOW)).toBe(false)
  })

  it('returns false when conversation is already archived', () => {
    const conv = makeConv({
      status: 'archived',
      first_advisor_message_at: new Date(NOW - 72 * HOUR_MS).toISOString(),
    })
    expect(isStaleGhostConversation(conv, NOW)).toBe(false)
  })

  it('returns false when conversation is completed', () => {
    const conv = makeConv({
      status: 'completed',
      first_advisor_message_at: new Date(NOW - 72 * HOUR_MS).toISOString(),
    })
    expect(isStaleGhostConversation(conv, NOW)).toBe(false)
  })

  it('returns false when no advisor has messaged yet', () => {
    const conv = makeConv()
    expect(isStaleGhostConversation(conv, NOW)).toBe(false)
  })
})

describe('ghostArchiveCutoffIso', () => {
  it('returns an ISO string 48 hours in the past', () => {
    const cutoff = ghostArchiveCutoffIso(NOW)
    const expectedMs = NOW - GHOST_REPLY_WINDOW_MS
    expect(new Date(cutoff).getTime()).toBe(expectedMs)
  })

  it('produces a valid ISO 8601 string', () => {
    const cutoff = ghostArchiveCutoffIso(NOW)
    expect(new Date(cutoff).toISOString()).toBe(cutoff)
  })
})

describe('GHOST_REPLY_WINDOW_MS', () => {
  it('equals 48 hours in milliseconds', () => {
    expect(GHOST_REPLY_WINDOW_MS).toBe(48 * 60 * 60 * 1000)
  })
})

/*
 * Manual Integration Test Steps
 * ==============================
 *
 * 1. Advisor first message sets tracking:
 *    - Create a conversation between a traveller and advisor.
 *    - As the advisor, send the first message.
 *    - Verify in DB: conversations.first_advisor_message_at IS NOT NULL.
 *
 * 2. Traveller reply marks engagement:
 *    - After step 1, as the traveller, send a reply.
 *    - Verify in DB: conversations.traveller_replied_after_advisor = true.
 *
 * 3. Traveller messaged first (edge case):
 *    - Create a new conversation. Traveller sends first message.
 *    - Advisor then sends first message.
 *    - Verify in DB: traveller_replied_after_advisor = true (set immediately
 *      by the AFTER INSERT trigger because the traveller already engaged).
 *
 * 4. Cron archiving:
 *    - Manually UPDATE a conversation's first_advisor_message_at to 49h ago via SQL.
 *    - Invoke cron: curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        http://localhost:3000/api/cron/archive-stale-leads
 *    - Verify: conversation status = 'archived'.
 *    - Verify: conversation no longer appears in advisor inbox sidebar.
 *
 * 5. Backend block on archived conversation:
 *    - With the conversation archived (from step 4), attempt to INSERT a message
 *      as a participant (via Supabase client or direct SQL).
 *    - Verify: INSERT is rejected by RLS policy AND the BEFORE INSERT trigger
 *      with error "Cannot send messages to an inactive conversation".
 *    - This confirms stale-tab and direct-API bypass scenarios are blocked.
 *
 * 6. UI archived banner:
 *    - Navigate to /chat/[archived-conversation-id] directly (bookmark/URL).
 *    - Verify: archived banner is visible, compose form is replaced with
 *      "This conversation is read-only." text.
 */
