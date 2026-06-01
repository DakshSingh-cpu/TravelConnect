'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TripPin } from '@/lib/data'
import type { TripItineraryBlock, TripPlaceHover, TripSidePanel } from '@/lib/tripPinExperience'
import { useTheme } from '@/lib/ThemeContext'

function PlaceLink({ place }: { place: TripPlaceHover }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, close])

  return (
    <div ref={rootRef} className="group/place relative mx-0.5 inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-semibold underline decoration-1 underline-offset-[3px] transition-colors"
        style={{ color: 'var(--teal)', textDecorationColor: 'rgba(15,110,86,0.35)' }}
      >
        {place.name}
      </button>
      <div
        className={`absolute left-1/2 top-[calc(100%+8px)] w-[min(18rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-xl border p-3 text-left shadow-2xl ring-1 ring-black/5 transition-all duration-150 ${
          open
            ? 'visible z-[200] translate-y-0 opacity-100 pointer-events-auto'
            : 'invisible z-0 -translate-y-1 opacity-0 pointer-events-none md:group-hover/place:visible md:group-hover/place:z-[200] md:group-hover/place:translate-y-0 md:group-hover/place:opacity-100 md:group-hover/place:pointer-events-auto'
        }`}
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <div className="mb-2 flex gap-2">
          <img
            src={place.image}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border object-cover"
            style={{ borderColor: 'var(--border)' }}
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {place.name}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--teal)' }}>
              {place.tag}
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--body)' }}>
          {place.blurb}
        </p>
      </div>
    </div>
  )
}

function BlockBody({ block }: { block: TripItineraryBlock }) {
  return (
    <div className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
      {block.segments.map((seg, i) => {
        if (seg.text) return <span key={`t-${i}`}>{seg.text}</span>
        if (seg.place) return <PlaceLink key={seg.place.id} place={seg.place} />
        return null
      })}
    </div>
  )
}

type Props = {
  pin: TripPin
  data: TripSidePanel
  onClose: () => void
}

export default function TripMapSidePanel({ pin, data, onClose }: Props) {
  const { theme } = useTheme()
  const glassBackground =
    theme === 'dark' ? 'rgba(24, 24, 27, 0.94)' : 'rgba(249, 246, 241, 0.95)'

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 1 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      className="fixed right-0 top-0 z-[120] flex h-screen w-full max-w-[480px] flex-col border-l shadow-2xl"
      style={{
        background: glassBackground,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'var(--border)',
      }}
      aria-label={`Itinerary for ${pin.route}`}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b px-5 py-4 backdrop-blur-md"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--header-bg)',
        }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--section-label)' }}>
            Trip Itinerary
          </p>
          <p className="mt-0.5 line-clamp-1 text-sm font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
            {pin.route}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-4 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
          }}
        >
          ✕ Close
        </button>
      </div>

      <div
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 pb-10 pt-5 [scrollbar-gutter:stable]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mb-5 grid grid-cols-5 gap-2 overflow-hidden rounded-2xl">
          <div
            className="relative col-span-3 min-h-[180px] overflow-hidden rounded-2xl border"
            style={{ borderColor: 'var(--border)' }}
          >
            <img
              src={data.heroImage}
              alt=""
              className="h-full min-h-[200px] w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="col-span-2 grid grid-cols-2 grid-rows-2 gap-2">
            {data.gallery.slice(0, 4).map((src, i) => (
              <div
                key={`${pin.id}-g-${i}`}
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: 'var(--border)' }}
              >
                <img src={src} alt="" className="h-full min-h-[72px] w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-1 flex flex-wrap items-baseline gap-2">
          <h3 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>
            {pin.route}
          </h3>
          <span className="text-sm" style={{ color: 'var(--gold)' }}>
            ★ {data.rating}
          </span>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {data.reviewLabel}
          </span>
        </div>
        <p
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
        >
          {data.category}
        </p>
        <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>
          {data.locationLine}
        </p>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--body)' }}>
          {data.overview}
        </p>

        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
          Full itinerary
        </p>
        <div className="flex flex-col gap-4">
          {data.days.map((day) => (
            <article
              key={day.day}
              className="rounded-2xl border p-5 shadow-sm"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold"
                  style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
                >
                  Day {day.day}
                </span>
                <h4 className="font-display text-lg" style={{ color: 'var(--ink)' }}>
                  {day.title}
                </h4>
              </div>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {day.summary}
              </p>
              <div className="flex flex-col gap-3">
                {day.blocks.map((block, bi) => (
                  <div
                    key={`${day.day}-${bi}`}
                    className="rounded-xl border p-4"
                    style={{
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <p className="mb-1.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      <span className="mr-2" aria-hidden="true">
                        {block.emoji}
                      </span>
                      {block.label}
                    </p>
                    <BlockBody block={block} />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div
          className="mt-8 rounded-2xl border p-5"
          style={{ background: 'var(--teal-light)', borderColor: 'var(--border)' }}
        >
          <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Love this route?
          </p>
          <p className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Priya will adapt the dates, hotels, and pacing to match your group. No exact pricing until you speak.
          </p>
          <button
            type="button"
            className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
          >
            Use this itinerary →
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
