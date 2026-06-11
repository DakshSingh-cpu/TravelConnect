'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { ensureMyProfileOptional } from '@/lib/chat/ensureProfile'
import {
  applyAccountRoleIntentIfNeeded,
  fetchMyAccountRole,
  roleLabel,
  setMyAccountRole,
  type AccountRole,
} from '@/lib/accountRole'

type Mode = 'sign_in' | 'sign_up'

type Props = {
  open: boolean
  onClose: () => void
  onAuthenticated?: () => void
  title?: string
  subtitle?: string
  /** Set immutable account role on successful sign-in (sign-up or sign-in). */
  accountRole?: AccountRole
  /** Optional URL to redirect to after Google OAuth. Defaults to current path. */
  nextUrl?: string
}

export default function AuthModal({
  open,
  onClose,
  onAuthenticated,

  title = 'Sign in to continue',
  subtitle = 'Create an account or sign in to message your advisor.',
  accountRole,
  nextUrl,
}: Props) {
  const [mode, setMode] = useState<Mode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open || !mounted) return null

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)

    const supabase = createClient()

    try {
      if (mode === 'sign_up') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || undefined },
          },
        })
        if (error) throw error
        if (accountRole) {
          try {
            await setMyAccountRole(accountRole)
          } catch {
            /* role may be set after email confirmation on first sign-in */
          }
        }
        setMessage('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        await ensureMyProfileOptional()
        if (accountRole) {
          const existing = await fetchMyAccountRole()
          if (existing && existing !== accountRole) {
            throw new Error(
              `This account is registered as a ${roleLabel(existing)}. Use the correct sign-in path for your account type.`,
            )
          }
          if (!existing) {
            await setMyAccountRole(accountRole)
          }
        } else {
          await applyAccountRoleIntentIfNeeded()
        }
        onAuthenticated?.()
        onClose()
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setBusy(true)
    setMessage(null)
    const supabase = createClient()
    const fallbackNext = window.location.pathname + window.location.search
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextUrl ?? fallbackNext
    )}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-xl"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <h2 id="auth-modal-title" className="font-display text-2xl" style={{ color: 'var(--ink)' }}>
          {title}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          {subtitle}
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGoogle()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors hover:bg-stone-50 disabled:opacity-60"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            or email
          </span>
          <span className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>

        <form onSubmit={(e) => void handleEmailAuth(e)} className="space-y-3">
          {mode === 'sign_up' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
                Full name
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={
                  {
                    borderColor: 'var(--border)',
                    '--tw-ring-color': 'var(--teal)',
                  } as React.CSSProperties
                }
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)' }}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--muted)' }}>
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)' }}
              autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
            />
          </label>

          {message && (
            <p className="text-sm" style={{ color: message.includes('Check your email') ? 'var(--teal)' : '#b91c1c' }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
          >
            {busy ? 'Please wait…' : mode === 'sign_up' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: 'var(--muted)' }}>
          {mode === 'sign_in' ? (
            <>
              New here?{' '}
              <button
                type="button"
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: 'var(--teal)' }}
                onClick={() => setMode('sign_up')}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: 'var(--teal)' }}
                onClick={() => setMode('sign_in')}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
