'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdvisorLink } from '@/hooks/useAdvisorLink'
import { useAccountRole } from '@/hooks/useAccountRole'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { parseAgencyIdFromAdvisorRoute } from '@/lib/matchAdvisors'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import {
  getAdvisorPreferences,
  saveAdvisorPreferences,
  validateAdvisorPreferences,
  ADVISOR_PREF_DEFAULTS,
  type AdvisorPreferences,
} from '@/lib/advisorPreferences'

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

  const [prefs, setPrefs] = useState<AdvisorPreferences>({ ...ADVISOR_PREF_DEFAULTS })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsMessage, setPrefsMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [prefsValidationError, setPrefsValidationError] = useState<string | null>(null)

  const agencyId = advisorLink ? parseAgencyIdFromAdvisorRoute(advisorLink.advisorRouteId) : null

  useEffect(() => {
    if (user?.id) {
      void getAdvisorPreferences(user.id).then(setPrefs)
    }
  }, [user?.id])

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

  async function handleSavePrefs() {
    if (!user) return

    const result = validateAdvisorPreferences(prefs)
    if (!result.success) {
      setPrefsValidationError(result.error)
      return
    }
    setPrefsValidationError(null)

    setSavingPrefs(true)
    setPrefsMessage(null)

    const { error } = await saveAdvisorPreferences(user.id, result.data)
    setSavingPrefs(false)

    if (error) {
      setPrefsMessage({ text: error, ok: false })
      return
    }
    setPrefsMessage({ text: 'Lead preferences saved.', ok: true })
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

      {/* Lead quality preferences */}
      <div
        className="mt-6 rounded-2xl border p-6 shadow-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
          Lead quality preferences
        </p>
        <p className="mb-5 text-xs" style={{ color: 'var(--muted)' }}>
          We will only send you leads that meet these thresholds.
        </p>

        <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Minimum readiness score: {prefs.min_readiness_score}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={prefs.min_readiness_score}
          onChange={(e) => {
            const raw = Number(e.target.value)
            setPrefs((p) => ({ ...p, min_readiness_score: Math.min(100, Math.max(0, raw)) }))
          }}
          className="mb-1 w-full"
        />
        <div className="mb-5 flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
          <span>All leads (0)</span>
          <span>Warm+ (50)</span>
          <span>Hot only (75)</span>
        </div>

        <label className="mb-1 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Minimum budget (₹ lakh)
        </label>
        <input
          type="number"
          min={0}
          max={9999.99}
          step={0.5}
          value={prefs.min_budget_lakh}
          onChange={(e) => {
            const raw = parseFloat(e.target.value)
            if (Number.isNaN(raw) || raw < 0) return
            setPrefs((p) => ({ ...p, min_budget_lakh: Math.min(9999.99, raw) }))
          }}
          className="mb-5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={{ borderColor: 'var(--border)', background: 'var(--cream)', color: 'var(--ink)' }}
        />

        <label className="mb-5 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.accept_nurture_leads}
            onChange={(e) => setPrefs((p) => ({ ...p, accept_nurture_leads: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border"
            style={{ accentColor: 'var(--teal)' }}
          />
          <span className="text-xs leading-relaxed" style={{ color: 'var(--body)' }}>
            Accept nurture leads — opt in to receive early-stage leads who are still exploring.
            These leads have lower readiness scores but may convert with guidance.
          </span>
        </label>

        {prefsValidationError && (
          <p className="mb-4 text-sm font-medium" style={{ color: '#b91c1c' }}>
            {prefsValidationError}
          </p>
        )}

        {prefsMessage && (
          <p className="mb-4 text-sm font-medium" style={{ color: prefsMessage.ok ? 'var(--teal)' : '#b91c1c' }}>
            {prefsMessage.text}
          </p>
        )}

        <button
          type="button"
          disabled={savingPrefs}
          onClick={() => void handleSavePrefs()}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
        >
          {savingPrefs ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}
