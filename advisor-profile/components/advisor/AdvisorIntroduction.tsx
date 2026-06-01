'use client'

import { useRef, useState } from 'react'
import type { AdvisorIntroductionContent } from '@/lib/advisorIntroduction'

type Props = {
  intro: AdvisorIntroductionContent
}

export default function AdvisorIntroduction({ intro }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  async function handlePlay() {
    const el = videoRef.current
    if (!el) return
    try {
      if (el.paused) {
        await el.play()
        setIsPlaying(true)
      } else {
        el.pause()
        setIsPlaying(false)
      }
    } catch {
      el.controls = true
      await el.play().catch(() => undefined)
    }
  }

  return (
    <section
      className="rounded-2xl border p-7 shadow-lg backdrop-blur-xl"
      aria-labelledby="intro-title"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
        Introduction
      </p>
      <h2 id="intro-title" className="mb-5 font-display text-xl" style={{ color: 'var(--ink)' }}>
        Meet {intro.firstName}
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(260px,340px)] lg:items-start">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
          {intro.bio}
        </p>

        <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <video
            ref={videoRef}
            className="aspect-video w-full bg-stone-900 object-cover"
            poster={intro.videoPosterUrl}
            src={intro.videoUrl}
            playsInline
            preload="metadata"
            controls={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            aria-label={`Video introduction from ${intro.firstName}`}
          />

          {!isPlaying && (
            <button
              type="button"
              onClick={handlePlay}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-stone-900/50 to-[#0F6E56]/35 transition-opacity hover:opacity-95"
              aria-label={`Play ${intro.videoDurationLabel} introduction video`}
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
                style={{ background: 'rgba(255,255,255,0.95)' }}
              >
                <span
                  className="ml-1 border-y-[10px] border-l-[16px] border-y-transparent"
                  style={{ borderLeftColor: 'var(--teal)' }}
                  aria-hidden
                />
              </span>
              <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90">
                Video intro · {intro.videoDurationLabel}
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
