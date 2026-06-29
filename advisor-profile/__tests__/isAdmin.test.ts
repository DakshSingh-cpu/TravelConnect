import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminUser, resolveIsAdmin } from '@/lib/admin/isAdmin'

const ORIGINAL = process.env.ADMIN_EMAILS

function mockAdmin(accountRole: string, email?: string): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { account_role: accountRole }, error: null }),
        }),
      }),
    }),
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: email ? { email } : null }, error: null }),
      },
    },
  } as unknown as SupabaseClient
}

describe('isAdminUser', () => {
  beforeEach(() => {
    delete process.env.ADMIN_EMAILS
  })
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = ORIGINAL
  })

  it('grants admin by account_role', () => {
    expect(isAdminUser({ account_role: 'admin' })).toBe(true)
  })

  it('grants admin by email allowlist', () => {
    process.env.ADMIN_EMAILS = 'boss@example.com, ops@example.com'
    expect(isAdminUser({ account_role: 'traveller', email: 'OPS@example.com' })).toBe(true)
  })

  it('denies non-admin role not in allowlist', () => {
    expect(isAdminUser({ account_role: 'traveller', email: 'nobody@example.com' })).toBe(false)
  })
})

describe('resolveIsAdmin', () => {
  beforeEach(() => {
    delete process.env.ADMIN_EMAILS
  })
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = ORIGINAL
  })

  it('returns true when DB role is admin', async () => {
    expect(await resolveIsAdmin(mockAdmin('admin'), 'user-1')).toBe(true)
  })

  it('returns false for a non-admin when no allowlist is configured (no admin API call)', async () => {
    const admin = mockAdmin('traveller', 'x@example.com')
    const spy = vi.spyOn(admin.auth.admin, 'getUserById')
    expect(await resolveIsAdmin(admin, 'user-1')).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  it('consults verified email allowlist when configured', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.com'
    expect(await resolveIsAdmin(mockAdmin('traveller', 'admin@example.com'), 'user-1')).toBe(true)
    expect(await resolveIsAdmin(mockAdmin('traveller', 'other@example.com'), 'user-1')).toBe(false)
  })
})
