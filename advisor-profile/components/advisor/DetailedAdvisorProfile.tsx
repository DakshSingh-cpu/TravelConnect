'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { matchResultsHref } from '@/lib/matchSession'
import AdvisorIntroduction from '@/components/advisor/AdvisorIntroduction'
import SidebarProfile from '@/components/SidebarProfile'
import TripMap from '@/components/TripMap'
import TripMapSidePanel from '@/components/TripMapSidePanel'
import PerformanceMetrics from '@/components/PerformanceMetrics'
import type { TripPin } from '@/lib/data'
import type { AgentMapPin } from '@/lib/agencyDataProcessor'
import { agentMapPinToTripPin, buildMapPinSidePanel } from '@/lib/mapPinExperience'
import type { AgentProfile } from '@/lib/agencyDataProcessor'
import { getAdvisorIntroduction } from '@/lib/advisorIntroduction'
import type { MatchedAdvisor } from '@/lib/matchAdvisors'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { useAdvisorLink } from '@/hooks/useAdvisorLink'
import { createClient } from '@/lib/supabase/client'

import 'leaflet/dist/leaflet.css'

type Props = {
  persona: MatchedAdvisor
  agentProfile: AgentProfile | null
  customBio?: string | null
  customVideoUrl?: string | null
}

export default function DetailedAdvisorProfile({
  persona,
  agentProfile,
  customBio,
  customVideoUrl,
}: Props) {
  const { user } = useSupabaseSession()
  const { advisorLink } = useAdvisorLink(user?.id ?? null)
  const isOwner = advisorLink?.advisorRouteId === persona.id

  const [selectedPin, setSelectedPin] = useState<TripPin | null>(null)
  const [selectedMapPin, setSelectedMapPin] = useState<AgentMapPin | null>(null)

  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editVideoUrl, setEditVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null)

  function handleStartEdit() {
    const intro = getAdvisorIntroduction(persona, agentProfile)
    setEditBio(customBio ?? intro.bio)
    setEditVideoUrl(customVideoUrl ?? intro.videoUrl)
    setEditing(true)
    setSaveMessage(null)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaveMessage(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('advisor_user_links')
      .update({ custom_bio: editBio, custom_video_url: editVideoUrl })
      .eq('user_id', user.id)
    setSaving(false)
    if (error) {
      setSaveMessage({ text: 'Failed to save. Please try again.', ok: false })
    } else {
      setSaveMessage({ text: 'Profile updated! Customers will see your changes.', ok: true })
      setEditing(false)
    }
  }

  const name = agentProfile?.agencyName || persona.name
  const mapPins = agentProfile?.mapPins ?? []
  const introduction = getAdvisorIntroduction(persona, agentProfile)

  // Merge custom overrides into introduction for customers
  const mergedIntro = {
    ...introduction,
    bio: customBio ?? introduction.bio,
    videoUrl: customVideoUrl ?? introduction.videoUrl,
  }

  function handlePinChange(pin: TripPin | null) {
    setSelectedPin(pin)
    if (!pin || mapPins.length === 0) {
      setSelectedMapPin(null)
      return
    }
    const idx = mapPins.findIndex((p, i) => agentMapPinToTripPin(p, i).id === pin.id)
    setSelectedMapPin(idx >= 0 ? mapPins[idx] : null)
  }

  const sidePanelData =
    selectedMapPin && agentProfile
      ? buildMapPinSidePanel(selectedMapPin, name)
      : null

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(100% 80% at 80% 0%, var(--grad-1) 0%, transparent 45%),
          radial-gradient(90% 60% at 10% 20%, var(--grad-2) 0%, transparent 40%),
          var(--cream)
        `,
      }}
    >
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 md:px-8" id="profile-main">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={isOwner ? '/chat' : matchResultsHref()}
            className="inline-flex items-center gap-2 text-sm transition-colors duration-200 hover:opacity-80"
            style={{ color: 'var(--muted)' }}
          >
            {isOwner ? '← Back to client inbox' : '← Back to your matches'}
          </Link>

          {/* Edit Profile button — only visible to the advisor who owns this profile */}
          {isOwner && !editing && (
            <button
              id="edit-profile-btn"
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-[rgba(15,110,86,0.06)]"
              style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 1 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Edit mode panel */}
        {isOwner && editing && (
          <div
            className="mb-8 rounded-2xl border p-6 shadow-lg"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
          >
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
              Edit Your Profile
            </p>
            <p className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Only your introduction and video can be changed. Agency name, metrics, and map data come from TravelConnect and
              stay read-only.
            </p>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                Introduction Bio
              </span>
              <textarea
                id="edit-bio-input"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  '--tw-ring-color': 'var(--teal)',
                } as React.CSSProperties}
                placeholder="Write a compelling introduction for potential clients..."
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                Introduction Video URL (MP4 link)
              </span>
              <input
                id="edit-video-url-input"
                type="url"
                value={editVideoUrl}
                onChange={(e) => setEditVideoUrl(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  '--tw-ring-color': 'var(--teal)',
                } as React.CSSProperties}
                placeholder="https://example.com/my-intro-video.mp4"
              />
            </label>

            {saveMessage && (
              <p
                className="mb-4 text-sm font-medium"
                style={{ color: saveMessage.ok ? 'var(--teal)' : '#b91c1c' }}
              >
                {saveMessage.text}
              </p>
            )}

            <div className="flex gap-3">
              <button
                id="save-profile-btn"
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setSaveMessage(null) }}
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-stone-50"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <motion.div
          layout
          className={`grid grid-cols-1 items-start gap-8 ${
            selectedPin ? 'md:pr-[480px]' : 'md:grid-cols-[340px_1fr]'
          }`}
          transition={{ type: 'spring', damping: 32, stiffness: 220 }}
        >
          <AnimatePresence mode="popLayout">
            {!selectedPin && (
              <motion.div
                key="profile-sidebar"
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="min-w-0 self-start md:sticky md:top-20"
              >
                <SidebarProfile persona={persona} agentProfile={agentProfile} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout className="flex min-w-0 flex-col gap-6">
            <AdvisorIntroduction intro={mergedIntro} />
            <TripMap
              mapPins={mapPins}
              bookingCities={agentProfile?.bookingCities ?? []}
              agencyName={name}
              selectedPin={selectedPin}
              onSelectedPinChange={handlePinChange}
            />
            <PerformanceMetrics agentProfile={agentProfile} />
          </motion.div>
        </motion.div>
      </main>

      <AnimatePresence>
        {selectedPin && sidePanelData && (
          <TripMapSidePanel
            key={selectedPin.id}
            pin={selectedPin}
            data={sidePanelData}
            onClose={() => {
              setSelectedPin(null)
              setSelectedMapPin(null)
            }}
          />
        )}
      </AnimatePresence>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-3 backdrop-blur-xl transition-colors duration-300 md:hidden"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
      >
        <div className="mx-auto flex max-w-lg gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #0F6E56, #0a5a46)' }}
          >
            Message {name.split(' ')[0]} →
          </button>
        </div>
      </div>
    </div>
  )
}
