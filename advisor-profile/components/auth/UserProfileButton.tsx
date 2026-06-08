'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { useAdvisorLink } from '@/hooks/useAdvisorLink'
import { useAccountRole } from '@/hooks/useAccountRole'
import { roleLabel } from '@/lib/accountRole'

export default function UserProfileButton() {
  const router = useRouter()
  const { user, loading } = useSupabaseSession()
  const { accountRole, loading: roleLoading } = useAccountRole(user?.id ?? null)
  const { advisorLink, loading: advisorLoading } = useAdvisorLink(user?.id ?? null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const isAdvisor = accountRole === 'advisor'

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  if (loading || !user) return null

  const email = user.email ?? ''
  const fullName: string =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    ''
  const avatarUrl: string | undefined =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined)

  const initials = fullName
    ? fullName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : email[0]?.toUpperCase() ?? '?'

  const badgeLabel = roleLoading
    ? '…'
    : accountRole
      ? roleLabel(accountRole)
      : advisorLink
        ? 'Travel Advisor'
        : 'Traveller'

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    setSigningOut(false)
    window.location.href = '/'
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id="user-profile-btn"
        type="button"
        aria-label="Your profile"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white shadow-md ring-2 ring-transparent transition-all duration-200 hover:ring-[var(--teal)] active:scale-95 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="user-profile-panel"
          role="dialog"
          aria-label="User profile"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[200] w-72 rounded-2xl shadow-2xl border backdrop-blur-xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div
            className="h-14"
            style={{
              background: 'linear-gradient(135deg, var(--teal), #0a5a46)',
            }}
          />

          <div className="relative -mt-8 px-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg ring-4 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0F6E56, #0a5a46)',
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>

          <div className="px-5 pb-2 pt-3">
            {fullName && (
              <p className="text-base font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
                {fullName}
              </p>
            )}
            <p
              className="mt-0.5 truncate text-sm"
              style={{ color: 'var(--muted)' }}
              title={email}
            >
              {email}
            </p>
          </div>

          <div className="mx-5 my-2" style={{ height: '1px', background: 'var(--border)' }} />

          <div className="px-5 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                  <circle cx="6" cy="6" r="6" />
                </svg>
                {badgeLabel}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {user.app_metadata?.provider === 'google' ? 'via Google' : 'via Email'}
              </span>
            </div>
          </div>

          {!advisorLoading && isAdvisor && advisorLink && (
            <div className="flex flex-col gap-2 px-5 pb-2">
              <button
                id="advisor-inbox-btn"
                type="button"
                onClick={() => {
                  setOpen(false)
                  router.push('/chat')
                }}
                className="flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[rgba(15,110,86,0.06)]"
                style={{ borderColor: 'var(--border)', color: 'var(--teal)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Client inbox
              </button>
              <button
                id="advisor-edit-profile-btn"
                type="button"
                onClick={() => {
                  setOpen(false)
                  router.push('/advisor/me/profile')
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
                style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit introduction &amp; video
              </button>
              <button
                id="advisor-profile-btn"
                type="button"
                onClick={() => {
                  setOpen(false)
                  router.push(`/advisor/${advisorLink.advisorRouteId}`)
                }}
                className="flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[rgba(15,110,86,0.06)]"
                style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                View public profile
              </button>
            </div>
          )}

          {!advisorLoading && isAdvisor && !advisorLink && (
            <div className="px-5 pb-2">
              <p className="rounded-xl border px-3 py-2.5 text-xs leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                Your advisor account is not linked to an agency profile yet. Contact support to complete setup.
              </p>
            </div>
          )}

          <div className="mx-5 my-2" style={{ height: '1px', background: 'var(--border)' }} />

          <div className="px-5 pb-5">
            <button
              id="sign-out-btn"
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-red-50 disabled:opacity-60"
              style={{ borderColor: 'var(--border)', color: '#b91c1c' }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
