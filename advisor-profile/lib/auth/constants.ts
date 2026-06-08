import type { AccountRole } from '@/lib/accountRole'

/** Default post-login destination per role (advisor inbox lives at /chat in this app). */
export const POST_LOGIN_PATH: Record<AccountRole, string> = {
  advisor: '/chat',
  traveller: '/chat',
}

export const LOGIN_PATH: Record<AccountRole, string> = {
  advisor: '/advisor/login',
  traveller: '/login',
}

/** Human-friendly Supabase auth error messages. */
export function formatAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists. Sign in instead.'
  }
  if (normalized.includes('password')) {
    return 'Password must be at least 6 characters.'
  }

  return message
}
