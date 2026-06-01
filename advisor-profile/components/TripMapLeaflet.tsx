'use client'

import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { AgentMapPin } from '@/lib/agencyDataProcessor'
import { buildMapPinHover, mapPinOpacity, mapPinRadius } from '@/lib/mapPinExperience'
import type { TripPin } from '@/lib/data'
import { buildTripHover, type TripHoverCard } from '@/lib/tripPinExperience'

function MapResizeSync({ panelOpen }: { panelOpen: boolean }) {
  const map = useMap()

  useEffect(() => {
    let isMounted = true

    const invalidate = () => {
      if (!isMounted || !map || !map.getContainer()) return
      try {
        map.invalidateSize({ animate: false, debounceMoveend: true })
      } catch {
        // Silently catch Leaflet internal errors during rapid unmounts
      }
    }

    const container = map.getContainer()
    if (!container) return

    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(invalidate)
    })
    ro.observe(container)

    const onWin = () => invalidate()
    window.addEventListener('resize', onWin)

    const t1 = window.setTimeout(invalidate, 0)
    const t2 = window.setTimeout(invalidate, 120)
    const t3 = window.setTimeout(invalidate, 320)

    return () => {
      isMounted = false
      ro.disconnect()
      window.removeEventListener('resize', onWin)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [map])

  useEffect(() => {
    let isMounted = true
    const id = window.setTimeout(() => {
      if (isMounted && map && map.getContainer()) {
        try {
          map.invalidateSize({ animate: false, debounceMoveend: true })
        } catch {
          // Silently catch Leaflet internal errors during rapid unmounts
        }
      }
    }, 280)
    return () => {
      isMounted = false
      window.clearTimeout(id)
    }
  }, [panelOpen, map])

  return null
}

function MapFitBounds({ pins }: { pins: AgentMapPin[] }) {
  const map = useMap()

  useEffect(() => {
    if (pins.length === 0) return
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 6, { animate: false })
      return
    }
    const lats = pins.map((p) => p.lat)
    const lngs = pins.map((p) => p.lng)
    const south = Math.min(...lats)
    const north = Math.max(...lats)
    const west = Math.min(...lngs)
    const east = Math.max(...lngs)
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [48, 48], maxZoom: 8, animate: false },
    )
  }, [map, pins])

  return null
}

function HoverCard({ data, pinLabel }: { data: TripHoverCard; pinLabel: string }) {
  return (
    <div className="w-72 overflow-hidden rounded-2xl border border-stone-700 bg-stone-900 text-left shadow-2xl ring-1 ring-black/50">
      <div className="relative h-40 w-full shrink-0">
        <img src={data.heroImage} className="h-full w-full object-cover" alt="" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-lg leading-snug text-white">{pinLabel}</p>
          <p className="text-xs text-stone-300">
            ★ {data.rating}{' '}
            <span className="text-stone-500">{data.reviewLabel}</span>
          </p>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{data.category}</p>
        <p className="line-clamp-1 text-xs text-stone-500">{data.locationLine}</p>
        <p className="line-clamp-3 text-xs leading-relaxed text-stone-300">{data.teaser}</p>
        <p className="border-t border-stone-800 pt-3 text-[10px] text-stone-500">{data.mentionedBy}</p>
      </div>
    </div>
  )
}

type LegacyProps = {
  mode: 'legacy'
  tripPins: TripPin[]
  typeColors: Record<string, string>
  selectedId: string | null
  onSelectPin: (pin: TripPin) => void
  panelOpen: boolean
}

type CsvProps = {
  mode: 'csv'
  mapPins: AgentMapPin[]
  agencyName: string
  selectedCity: string | null
  onSelectPin: (pin: AgentMapPin) => void
  panelOpen: boolean
}

type Props = LegacyProps | CsvProps

const DEFAULT_CENTER: [number, number] = [25.5, 45]
const DEFAULT_ZOOM = 4

/** CARTO light basemap without OSM region labels (those use local scripts, e.g. 亚洲, أفريقيا). */
const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

export default function TripMapLeaflet(props: Props) {
  const panelOpen = props.panelOpen

  if (props.mode === 'csv') {
    const { mapPins, agencyName, selectedCity, onSelectPin } = props
    const maxCount = Math.max(1, ...mapPins.map((p) => p.count))

    return (
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={2}
        scrollWheelZoom={false}
        className="z-0 h-full min-h-[380px] w-full rounded-xl"
        style={{ height: '100%', width: '100%', minHeight: 380 }}
        attributionControl={false}
      >
        <MapResizeSync panelOpen={panelOpen} />
        <MapFitBounds pins={mapPins} />
        <TileLayer url={MAP_TILE_URL} />
        {mapPins.map((pin) => {
          const selected = selectedCity === pin.city
          const t = pin.count / maxCount
          const fillColor =
            t > 0.66 ? '#0F6E56' : t > 0.33 ? '#0a5a46' : '#3d8f7a'

          return (
            <CircleMarker
              key={pin.city}
              center={[pin.lat, pin.lng]}
              radius={mapPinRadius(pin.count, selected)}
              pathOptions={{
                fillColor,
                fillOpacity: mapPinOpacity(pin.count, selected),
                color: '#fff',
                weight: selected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onSelectPin(pin),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -14]}
                opacity={1}
                className="trip-map-hover-tip !border-0 !bg-transparent !p-0 !shadow-none"
              >
                <HoverCard data={buildMapPinHover(pin, agencyName)} pinLabel={pin.city} />
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    )
  }

  const { tripPins, typeColors, selectedId, onSelectPin } = props

  return (
    <MapContainer
      center={[47.5, 10.5]}
      zoom={4}
      minZoom={3}
      scrollWheelZoom={false}
      className="z-0 h-full min-h-[380px] w-full rounded-xl"
      style={{ height: '100%', width: '100%', minHeight: 380 }}
      attributionControl={false}
    >
      <MapResizeSync panelOpen={panelOpen} />
      <TileLayer url={MAP_TILE_URL} />
      {tripPins.map((pin) => {
        const selected = selectedId === pin.id
        return (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={selected ? 12 : 9}
            pathOptions={{
              fillColor: typeColors[pin.type] ?? '#0F6E56',
              fillOpacity: selected ? 1 : 0.92,
              color: '#fff',
              weight: selected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onSelectPin(pin),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -14]}
              opacity={1}
              className="trip-map-hover-tip !border-0 !bg-transparent !p-0 !shadow-none"
            >
              <HoverCard data={buildTripHover(pin)} pinLabel={pin.city} />
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
