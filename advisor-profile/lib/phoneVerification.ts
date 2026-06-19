/*
 * PRODUCTION PREREQUISITE — SMS Rate Limiting
 *
 * Before enabling phone OTP in production, configure these in the Supabase dashboard:
 *
 * 1. Authentication → Rate Limits:
 *    - "Send OTP" rate limit: ~3 per phone per hour, ~10 per IP per hour
 *    - "Verify OTP" rate limit: ~5 attempts per phone per 15 minutes
 *
 * 2. Authentication → Providers → Phone:
 *    - Enable the Phone provider
 *    - Configure Twilio / MessageBird / Vonage credentials
 *    - Set SMS template with project name
 *
 * 3. Optional: Enable CAPTCHA (hCaptcha/Turnstile) on auth endpoints
 *
 * 4. Set up Twilio/MessageBird spend alerts to detect SMS pumping
 *
 * These limits prevent toll fraud where attackers trigger thousands of SMS
 * messages to premium-rate numbers, draining your SMS provider budget.
 */

import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

// ── E.164 normalization ────────────────────────────────────────────────────────

const MIN_PHONE_DIGITS = 10
const INDIA_COUNTRY_CODE = '+91'

export class PhoneValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PhoneValidationError'
  }
}

/**
 * Normalizes a phone string to E.164 format.
 * Bare 10-digit numbers default to India (+91).
 */
export function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')

  if (digits.startsWith('+')) {
    const numericPart = digits.slice(1).replace(/\D/g, '')
    if (numericPart.length < MIN_PHONE_DIGITS) {
      throw new PhoneValidationError('Phone number is too short')
    }
    return digits
  }

  const bareDigits = digits.replace(/\D/g, '')
  if (bareDigits.length < MIN_PHONE_DIGITS) {
    throw new PhoneValidationError('Phone number must have at least 10 digits')
  }

  if (bareDigits.length === 10) {
    return `${INDIA_COUNTRY_CODE}${bareDigits}`
  }

  return `+${bareDigits}`
}

// ── Session-based verification check ───────────────────────────────────────────

/**
 * Pure helper: checks whether a Supabase user object has a confirmed phone.
 * Testable without a live Supabase instance.
 */
export function isPhoneVerifiedFromUser(user: Pick<User, 'phone'> | null | undefined): boolean {
  return Boolean(user?.phone)
}

/**
 * Checks the active browser session for a verified phone.
 * No DB round-trip — reads the JWT session claim directly.
 *
 * IMPORTANT: Production requires Supabase Auth SMS rate limits configured
 * in the dashboard to prevent SMS pumping / toll fraud.
 */
export async function checkPhoneVerified(): Promise<{
  verified: boolean
  phone: string | null
}> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return {
    verified: isPhoneVerifiedFromUser(session?.user),
    phone: session?.user?.phone ?? null,
  }
}

// ── OTP send / verify ──────────────────────────────────────────────────────────

/**
 * Triggers an SMS OTP by updating the user's phone on the existing session.
 * Uses Supabase Auth's `updateUser({ phone })` which sends the OTP automatically.
 */
export async function sendPhoneOtp(
  phone: string,
): Promise<{ error: string | null }> {
  const normalized = normalizePhoneE164(phone)
  const supabase = createClient()

  // Test numbers configured in Supabase Auth → Phone skip real SMS but still
  // require updateUser so verifyOtp(type: phone_change) has a pending change.
  const { error } = await supabase.auth.updateUser({ phone: normalized })

  return { error: error?.message ?? null }
}

/**
 * Verifies the SMS OTP code. On success, Supabase Auth sets `phone` and
 * `phone_confirmed_at` on auth.users and refreshes the session JWT.
 *
 * No public.users writes — verification state lives only in auth.users.
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string,
): Promise<{ success: boolean; error: string | null }> {
  const normalized = normalizePhoneE164(phone)
  const supabase = createClient()

  const { error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: 'phone_change',
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    return { success: false, error: refreshError.message }
  }

  return { success: true, error: null }
}

// ── Session type guard for server-side checks ──────────────────────────────────

/**
 * Checks whether a session indicates phone verification.
 * Useful in server routes that have access to the session.
 */
export function isPhoneVerifiedFromSession(
  session: Session | null | undefined,
): boolean {
  return isPhoneVerifiedFromUser(session?.user)
}
