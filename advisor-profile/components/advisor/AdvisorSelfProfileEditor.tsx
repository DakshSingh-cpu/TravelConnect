'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdvisorLink } from '@/hooks/useAdvisorLink'
import { useAccountRole } from '@/hooks/useAccountRole'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { parseAgencyIdFromAdvisorRoute } from '@/lib/matchAdvisors'
import type { AgentProfile } from '@/lib/agencyDataProcessor'

export default function AdvisorSelfProfileEditor() {
  const { user, loading: sessionLoading } = useSupabaseSession()
  const { accountRole } = useAccountRole(user?.id ?? null)
  const { advisorLink, loading: linkLoading } = useAdvisorLink(user?.id ?? null)

  const [agencyProfile, setAgencyProfile] = useState<AgentProfile | null>(null)
  const [bio, setBio] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const agencyId = advisorLink ? parseAgencyIdFromAdvisorRoute(advisorLink.advisorRouteId) : null

  useEffect(() => {
    if (!advisorLink) {
      setLoadingProfile(false)
      return
    }

    setBio(advisorLink.customBio ?? '')
    setVideoUrl(advisorLink.customVideoUrl ?? '')

    if (!agencyId) {
      setLoadingProfile(false)
      return
    }

    let cancelled = false
    void fetch(`/api/agency-profile?agencyId=${agencyId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile?: AgentProfile | null } | null) => {
        if (!cancelled) setAgencyProfile(data?.profile ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false)
      })

    return () => {
      cancelled = true
    }
  }, [advisorLink, agencyId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('advisor_user_links')
      .update({
        custom_bio: bio.trim() || null,
        custom_video_url: videoUrl.trim() || null,
      })
      .eq('user_id', user.id)

    setSaving(false)

    if (error) {
      setMessage({ text: error.message, ok: false })
      return
    }

    setMessage({ text: 'Saved. Travellers will see your updated introduction on your public profile.', ok: true })
  }

  if (sessionLoading || linkLoading) {
    return (
      <p className="py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>
        Loading…
      </p>
    )
  }

  if (!user) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Please sign in as a travel advisor.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold" style={{ color: 'var(--teal)' }}>
          ← Back home
        </Link>
      </div>
    )
  }

  if (accountRole === 'traveller') {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 text-center">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          This page is for travel advisors only. Your account is registered as a Traveller.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold" style={{ color: 'var(--teal)' }}>
          Find advisors →
        </Link>
      </div>
    )
  }

  if (!advisorLink) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 text-center">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          Your advisor account is not linked to an agency profile yet. Ask an administrator to link your account in
          Supabase.
        </p>
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
        >
          Go to inbox
        </Link>
      </div>
    )
  }

  const agencyName = agencyProfile?.agencyName ?? 'Your agency'

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
            Advisor profile
          </p>
          <h1 className="font-display mt-1 text-2xl" style={{ color: 'var(--ink)' }}>
            Edit your introduction
          </h1>
        </div>
        <Link
          href="/chat"
          className="text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--teal)' }}
        >
          ← Back to inbox
        </Link>
      </div>

      {/* Read-only agency data from TravelConnect database */}
      <section
        className="mb-6 rounded-2xl border p-5"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
          From TravelConnect database (read-only)
        </p>
        {loadingProfile ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading agency details…
          </p>
        ) : (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                Agency name
              </dt>
              <dd className="font-semibold" style={{ color: 'var(--ink)' }}>
                {agencyName}
              </dd>
            </div>
            {agencyProfile?.bookingCities && agencyProfile.bookingCities.length > 0 && (
              <div>
                <dt className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                  Top destinations
                </dt>
                <dd style={{ color: 'var(--body)' }}>
                  {agencyProfile.bookingCities.slice(0, 6).map((c) => c.city).join(' · ')}
                </dd>
              </div>
            )}
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Performance metrics, map pins, and match scores are synced from verified booking data and cannot be
              edited here.
            </p>
          </dl>
        )}
      </section>

      {/* Editable overrides */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="rounded-2xl border p-6 shadow-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
          You can edit
        </p>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Introduction
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)', background: 'var(--cream)', color: 'var(--ink)' }}
            placeholder="Tell travellers about your expertise, style, and what makes your agency unique…"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            Video introduction URL
          </span>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)', background: 'var(--cream)', color: 'var(--ink)' }}
            placeholder="https://…/your-intro.mp4"
          />
          <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            Direct link to an MP4 or hosted video travellers can play on your profile.
          </p>
        </label>

        {message && (
          <p className="mb-4 text-sm font-medium" style={{ color: message.ok ? 'var(--teal)' : '#b91c1c' }}>
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link
            href={`/advisor/${advisorLink.advisorRouteId}`}
            className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[rgba(15,110,86,0.06)]"
            style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}
          >
            Preview public profile
          </Link>
        </div>
      </form>
    </div>
  )
}
