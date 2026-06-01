'use client'

import { advisor } from '@/lib/data'

export default function AboutMe() {
  return (
    <section
      className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl shadow-lg p-7"
      aria-labelledby="about-title"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-4">About Priya</p>

      {/* Video Intro Placeholder */}
      <div
        className="relative w-full rounded-xl overflow-hidden mb-6 cursor-pointer group"
        style={{ minHeight: '10rem', background: '#1a1714' }}
        role="button"
        tabIndex={0}
        aria-label="Play Meet Priya: 30-second video intro (coming soon)"
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80')",
          }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(28,25,23,.55) 0%, rgba(15,110,86,.35) 100%)' }}
        />
        {/* Glass panel */}
        <div
          className="absolute inset-4 rounded-xl flex flex-col justify-end p-5 backdrop-blur-md"
          style={{
            background: 'rgba(255,255,255,.12)',
            border: '1px solid rgba(255,255,255,.32)',
            boxShadow: '0 8px 32px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.38)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">Video Intro</p>
          <p className="font-display text-xl text-white leading-tight" style={{ textShadow: '0 2px 16px rgba(0,0,0,.35)' }}>
            Meet Priya
          </p>
          <p className="text-xs text-white/75 mt-1">30-second welcome — coming soon</p>
        </div>
        {/* Play button */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        >
          <span
            className="ml-1"
            style={{
              borderStyle: 'solid',
              borderWidth: '0.5rem 0 0.5rem 0.85rem',
              borderColor: 'transparent transparent transparent #0F6E56',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Bio paragraphs */}
      <div className="space-y-4 text-[0.9375rem] leading-relaxed text-stone-700">
        {advisor.bio.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  )
}
