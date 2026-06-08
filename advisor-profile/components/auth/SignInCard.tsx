'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AccountRole } from '@/lib/accountRole'
import { POST_LOGIN_PATH } from '@/lib/auth/constants'
import { signInWithEmail, signInWithGoogle } from '@/lib/auth/signIn'
import GoogleIcon from '@/components/auth/GoogleIcon'

type Mode = 'sign_in' | 'sign_up'

export type SignInCardProps = {
  accountRole: AccountRole
  heading: React.ReactNode
  subheading: string
  /** Tailwind classes for email/password inputs (e.g. bg-white vs bg-blue-50). */
  inputClassName?: string
  alternateLoginHref?: string
  alternateLoginLabel?: string
}

const BRAND_GREEN = '#115e41'

export default function SignInCard({
  accountRole,
  heading,
  subheading,
  inputClassName = 'bg-white',
  alternateLoginHref,
  alternateLoginLabel,
}: SignInCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<Mode>(
    searchParams.get('signup') === '1' ? 'sign_up' : 'sign_in',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setMessage(decodeURIComponent(urlError))
    }
  }, [searchParams])

  const nextPath = searchParams.get('next')
  const postLoginPath =
    nextPath?.startsWith('/') ? nextPath : POST_LOGIN_PATH[accountRole]

  async function handleGoogle() {
    setBusy(true)
    setMessage(null)

    const result = await signInWithGoogle(accountRole, nextPath)
    if (!result.ok) {
      setMessage(result.error)
      setBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)

    const result = await signInWithEmail({
      email,
      password,
      accountRole,
      mode,
      fullName,
    })

    if (!result.ok) {
      setMessage(result.error)
      setBusy(false)
      return
    }

    if (result.needsEmailConfirmation) {
      setMessage('Check your email to confirm your account, then sign in.')
      setMode('sign_in')
      setBusy(false)
      return
    }

    router.push(postLoginPath)
    router.refresh()
  }

  const inputBase =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-shadow focus:border-[#115e41] focus:ring-2 focus:ring-[#115e41]/20'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f4] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-stone-200/80 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <h1 className="font-display text-3xl text-stone-900">{heading}</h1>
        <p className="mt-2 text-sm text-gray-500">{subheading}</p>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGoogle()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            or email
          </span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {mode === 'sign_up' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-gray-500">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`${inputBase} ${inputClassName}`}
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-gray-500">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputBase} ${inputClassName}`}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-gray-500">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} ${inputClassName}`}
              autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
            />
          </label>

          {message && (
            <p
              className="text-sm"
              style={{
                color: message.includes('Check your email') ? BRAND_GREEN : '#b91c1c',
              }}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            {busy ? 'Please wait…' : mode === 'sign_up' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {mode === 'sign_in' ? (
            <>
              New here?{' '}
              <button
                type="button"
                className="font-semibold hover:underline"
                style={{ color: BRAND_GREEN }}
                onClick={() => {
                  setMode('sign_up')
                  setMessage(null)
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-semibold hover:underline"
                style={{ color: BRAND_GREEN }}
                onClick={() => {
                  setMode('sign_in')
                  setMessage(null)
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {alternateLoginHref && alternateLoginLabel && (
          <p className="mt-3 text-center text-xs text-gray-400">
            <Link href={alternateLoginHref} className="underline-offset-2 hover:underline">
              {alternateLoginLabel}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
