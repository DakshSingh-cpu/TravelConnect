'use client'

import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import type { AgentMapPin } from '@/lib/agencyDataProcessor'
import { tripPins, type TripPin } from '@/lib/data'
import {
  agentMapPinToTripPin,
  buildMapPinSidePanel,
} from '@/lib/mapPinExperience'
import { buildTripSidePanel } from '@/lib/tripPinExperience'
import TripMapSidePanel from '@/components/TripMapSidePanel'

const TripMapLeaflet = dynamic(() => import('@/components/TripMapLeaflet'), { ssr: false })

export type TripMapProps = {
  /** Live CSV destination pins — when provided, map uses platform booking data. */
  mapPins?: AgentMapPin[]
  /** Cities from City Bookings Map even when not yet geocoded (for empty-map messaging). */
  bookingCities?: { city: string; count: number }[]
  agencyName?: string
  /** When false, never show the old Priya demo pins if CSV pins are empty. */
  allowLegacyDemoPins?: boolean
  /** When used with `onSelectedPinChange`, selection is controlled by the parent (e.g. split-page itinerary). */
  selectedPin?: TripPin | null
  onSelectedPinChange?: (pin: TripPin | null) => void
}

const legacyTypeColors: Record<string, string> = {
  Family: '#0F6E56',
  Couple: '#BA7517',
  Honeymoon: '#c45e8a',
  Solo: '#6366f1',
  Group: '#0ea5e9',
  Verified: '#0F6E56',
}

function VolumeLegend({ pins }: { pins: AgentMapPin[] }) {
  const max = Math.max(1, ...pins.map((p) => p.count))
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
      <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--section-label)' }}>
        Booking volume
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#3d8f7a]" />
        Lower
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full bg-[#0a5a46]" />
        Medium
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#0F6E56]" />
        Up to {max} trips
      </span>
    </div>
  )
}

function LegacyLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {Object.entries(legacyTypeColors)
        .filter(([k]) => k !== 'Verified')
        .map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
    </div>
  )
}

export default function TripMap({
  mapPins = [],
  bookingCities = [],
  agencyName = 'This partner',
  allowLegacyDemoPins = false,
  selectedPin = null,
  onSelectedPinChange,
}: TripMapProps) {
  const useCsvPins = mapPins.length > 0
  const unmappedCities = useMemo(() => {
    if (bookingCities.length === 0) return []
    const plotted = new Set(mapPins.map((p) => p.city.toLowerCase()))
    return bookingCities.filter((b) => !plotted.has(b.city.toLowerCase()))
  }, [bookingCities, mapPins])
  const showLegacyDemo = !useCsvPins && allowLegacyDemoPins
  const [internalSelected, setInternalSelected] = useState<TripPin | null>(null)
  const [selectedMapPin, setSelectedMapPin] = useState<AgentMapPin | null>(null)

  const controlled = onSelectedPinChange !== undefined
  const selected = controlled ? selectedPin ?? null : internalSelected
  const setSelected = controlled ? onSelectedPinChange : setInternalSelected

  const pinCount = useCsvPins ? mapPins.length : showLegacyDemo ? tripPins.length : 0

  const selectedCity = useMemo(() => {
    if (!useCsvPins || !selected) return selectedMapPin?.city ?? null
    const match = mapPins.find((p) => agentMapPinToTripPin(p, 0).id === selected.id)
    return match?.city ?? selectedMapPin?.city ?? null
  }, [useCsvPins, selected, mapPins, selectedMapPin])

  useEffect(() => {
    if (!selected) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelected(null)
        setSelectedMapPin(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, setSelected])

  function handleCsvPinClick(pin: AgentMapPin) {
    const index = mapPins.findIndex((p) => p.city === pin.city)
    setSelectedMapPin(pin)
    setSelected(agentMapPinToTripPin(pin, index >= 0 ? index : 0))
  }

  const sidePanelData = useMemo(() => {
    if (!selected) return null
    if (useCsvPins && selectedMapPin) {
      return buildMapPinSidePanel(selectedMapPin, agencyName)
    }
    return buildTripSidePanel(selected)
  }, [selected, selectedMapPin, useCsvPins, agencyName])

  return (
    <section
      className="rounded-2xl border p-7 shadow-lg backdrop-blur-xl"
      aria-labelledby="map-title"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--section-label)' }}>
        Destinations
      </p>
      <h2 id="map-title" className="mb-1 font-display text-xl" style={{ color: 'var(--ink)' }}>
        Where we&apos;ve sent clients
      </h2>
      <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
        {useCsvPins
          ? `${pinCount} verified destinations from TravelConnect booking data — marker size reflects 90-day hotel volume.`
          : `${pinCount} verified trips — hover a pin for a preview, click to open details.`}
      </p>

      <div
        className="relative min-h-[380px] overflow-hidden rounded-xl border"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
      >
        {useCsvPins ? (
          <div className="relative z-0 min-h-[380px] w-full">
            <TripMapLeaflet
              mode="csv"
              mapPins={mapPins}
              agencyName={agencyName}
              selectedCity={selectedCity}
              onSelectPin={handleCsvPinClick}
              panelOpen={Boolean(selected)}
            />
          </div>
        ) : showLegacyDemo && pinCount > 0 ? (
          <div className="relative z-0 min-h-[380px] w-full">
            <TripMapLeaflet
              mode="legacy"
              tripPins={tripPins}
              typeColors={legacyTypeColors}
              selectedId={selected?.id ?? null}
              onSelectPin={setSelected}
              panelOpen={Boolean(selected)}
            />
          </div>
        ) : (
          <div
            className="flex min-h-[380px] flex-col items-center justify-center gap-3 px-6 text-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            {bookingCities.length > 0 ? (
              <>
                <p>
                  Booking history includes{' '}
                  <strong style={{ color: 'var(--ink)' }}>
                    {bookingCities.map((b) => b.city).join(', ')}
                  </strong>
                  , but map pins need coordinates we don&apos;t have yet for{' '}
                  {unmappedCities.length > 0
                    ? unmappedCities.map((b) => b.city).join(', ')
                    : 'these cities'}
                  .
                </p>
                <p className="max-w-md text-xs">
                  Expert tags and cities served still use this data; we&apos;re expanding the location
                  dictionary so more partners appear on the map.
                </p>
              </>
            ) : (
              <p>
                No verified destination bookings in the platform record for this partner yet.
              </p>
            )}
          </div>
        )}

        {!controlled && (
          <AnimatePresence>
            {selected && sidePanelData && (
              <>
                <motion.button
                  key="itinerary-backdrop"
                  type="button"
                  aria-label="Close destination panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-0 z-[119] bg-stone-900/45 backdrop-blur-sm md:absolute md:inset-0 md:bg-stone-900/25"
                  onClick={() => {
                    setSelected(null)
                    setSelectedMapPin(null)
                  }}
                />
                <TripMapSidePanel
                  key={selected.id}
                  pin={selected}
                  data={sidePanelData}
                  onClose={() => {
                    setSelected(null)
                    setSelectedMapPin(null)
                  }}
                />
              </>
            )}
          </AnimatePresence>
        )}
      </div>

      {useCsvPins ? <VolumeLegend pins={mapPins} /> : showLegacyDemo ? <LegacyLegend /> : null}
    </section>
  )
}
