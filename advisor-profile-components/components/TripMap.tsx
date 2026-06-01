'use client'

import dynamic from 'next/dynamic'
import { tripPins, TripPin } from '@/lib/data'
import { useState } from 'react'

// Dynamically import Leaflet to avoid SSR errors (window is not defined)
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })

const typeColors: Record<string, string> = {
  Family: '#0F6E56',
  Couple: '#BA7517',
  Honeymoon: '#c45e8a',
  Solo: '#6366f1',
  Group: '#0ea5e9',
}

function MapLegend() {
  const entries = Object.entries(typeColors)
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {entries.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-stone-600">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

export default function TripMap() {
  const [activePin, setActivePin] = useState<TripPin | null>(null)

  return (
    <section
      className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl shadow-lg p-7"
      aria-labelledby="map-title"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Destinations</p>
      <h2 className="font-display text-xl text-stone-900 mb-1">Where I've sent clients</h2>
      <p className="text-sm text-stone-500 mb-4">
        {tripPins.length} verified trips across Europe — click any pin for details.
      </p>

      {/* Map */}
      <div className="w-full rounded-xl overflow-hidden" style={{ height: '380px' }}>
        <MapContainer
          center={[47.5, 10.5]}
          zoom={4}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {tripPins.map((pin) => (
            <CircleMarker
              key={pin.id}
              center={[pin.lat, pin.lng]}
              radius={9}
              pathOptions={{
                fillColor: typeColors[pin.type] ?? '#0F6E56',
                fillOpacity: 0.9,
                color: '#fff',
                weight: 2,
              }}
              eventHandlers={{
                click: () => setActivePin(pin),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[180px]">
                  <p className="font-semibold text-sm text-stone-900 mb-0.5">{pin.route}</p>
                  <p className="text-xs text-stone-500">{pin.duration}</p>
                  <span
                    className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ background: typeColors[pin.type] ?? '#0F6E56' }}
                  >
                    {pin.type}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <MapLegend />
    </section>
  )
}
