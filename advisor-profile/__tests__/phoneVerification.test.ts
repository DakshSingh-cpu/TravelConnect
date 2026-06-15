import { describe, it, expect } from 'vitest'
import {
  normalizePhoneE164,
  PhoneValidationError,
  isPhoneVerifiedFromUser,
  isPhoneVerifiedFromSession,
} from '@/lib/phoneVerification'
import { estimateReadinessCeiling } from '@/lib/guardrails/readiness'
import { INTAKE_FIELD_DEFAULTS } from '@/lib/guardrails/constants'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import type { Session, User } from '@supabase/supabase-js'

/*
 * Manual OTP integration test checklist (requires running Supabase with Phone auth enabled):
 *
 * 1. Sign in with email/password
 * 2. Call sendPhoneOtp('+91...') — verify SMS arrives (or auto-confirm in dev)
 * 3. Call verifyPhoneOtp('+91...', '123456') — verify session.user.phone is set
 * 4. Call checkPhoneVerified() — expect { verified: true, phone: '+91...' }
 * 5. Click "Chat with [Name]" — expect no phone modal, chat opens
 * 6. In browser console: supabase.from('users').update({ phone_verified: true })
 *    — expect this to fail (column does not exist)
 * 7. Remove phone from auth.users via dashboard — expect RPC to reject conversation creation
 */

const intake: MatchIntakePayload = {
  destination: 'Tokyo',
  budgetLakh: 10,
  travelStyle: 'Couple',
  ...INTAKE_FIELD_DEFAULTS,
}

describe('normalizePhoneE164', () => {
  it('adds +91 to bare 10-digit Indian number', () => {
    expect(normalizePhoneE164('9876543210')).toBe('+919876543210')
  })

  it('preserves existing +91 prefix', () => {
    expect(normalizePhoneE164('+919876543210')).toBe('+919876543210')
  })

  it('strips spaces and dashes', () => {
    expect(normalizePhoneE164('98765 432-10')).toBe('+919876543210')
  })

  it('handles international number with country code', () => {
    expect(normalizePhoneE164('+14155551234')).toBe('+14155551234')
  })

  it('throws for too-short number', () => {
    expect(() => normalizePhoneE164('12345')).toThrow(PhoneValidationError)
  })

  it('throws for empty string', () => {
    expect(() => normalizePhoneE164('')).toThrow(PhoneValidationError)
  })

  it('handles number with leading zero (India landline style)', () => {
    expect(normalizePhoneE164('09876543210')).toBe('+09876543210')
  })
})

describe('isPhoneVerifiedFromUser', () => {
  it('returns true when user has phone', () => {
    expect(isPhoneVerifiedFromUser({ phone: '+919876543210' } as User)).toBe(true)
  })

  it('returns false when user has no phone', () => {
    expect(isPhoneVerifiedFromUser({} as User)).toBe(false)
  })

  it('returns false for null user', () => {
    expect(isPhoneVerifiedFromUser(null)).toBe(false)
  })

  it('returns false for undefined user', () => {
    expect(isPhoneVerifiedFromUser(undefined)).toBe(false)
  })

  it('returns false when phone is empty string', () => {
    expect(isPhoneVerifiedFromUser({ phone: '' } as User)).toBe(false)
  })
})

describe('isPhoneVerifiedFromSession', () => {
  it('returns true for session with phone', () => {
    const session = { user: { phone: '+919876543210' } } as Session
    expect(isPhoneVerifiedFromSession(session)).toBe(true)
  })

  it('returns false for session without phone', () => {
    const session = { user: {} } as Session
    expect(isPhoneVerifiedFromSession(session)).toBe(false)
  })

  it('returns false for null session', () => {
    expect(isPhoneVerifiedFromSession(null)).toBe(false)
  })
})

describe('estimateReadinessCeiling with phoneVerified', () => {
  it('raises ceiling by 10 when phone is verified (broad destination)', () => {
    const broadIntake = { ...intake, destination: 'Southeast Asia' }
    const withoutPhone = estimateReadinessCeiling(broadIntake, 5, false)
    const withPhone = estimateReadinessCeiling(broadIntake, 5, true)
    expect(withPhone).toBe(withoutPhone + 10)
  })

  it('caps boosted ceiling at 100', () => {
    expect(estimateReadinessCeiling(intake, 5, true)).toBeLessThanOrEqual(100)
  })

  it('boosts broad-destination ceiling from 60 to 70', () => {
    const broadIntake = { ...intake, destination: 'Europe' }
    expect(estimateReadinessCeiling(broadIntake, 5, false)).toBe(60)
    expect(estimateReadinessCeiling(broadIntake, 5, true)).toBe(70)
  })

  it('does not exceed 100 for non-broad destination with phone verified', () => {
    expect(estimateReadinessCeiling(intake, 5, true)).toBe(100)
  })

  it('boosts low-turn ceiling from 30 to 40', () => {
    expect(estimateReadinessCeiling(intake, 1, false)).toBe(30)
    expect(estimateReadinessCeiling(intake, 1, true)).toBe(40)
  })
})
