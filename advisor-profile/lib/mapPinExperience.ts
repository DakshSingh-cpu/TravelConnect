import type { AgentMapPin } from '@/lib/agencyDataProcessor'
import { TRIP_PIN_POPUP_IMAGES } from '@/lib/data'
import type { TripPin } from '@/lib/data'
import type { TripHoverCard, TripSidePanel } from '@/lib/tripPinExperience'
import { tripImagesHiRes } from '@/lib/tripPinExperience'

export function agentMapPinToTripPin(pin: AgentMapPin, index: number): TripPin {
  const slug = pin.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    id: `csv-${slug}-${index}`,
    city: pin.city,
    lat: pin.lat,
    lng: pin.lng,
    route: `${pin.count} verified hotel bookings`,
    duration: '90-day platform window',
    type: 'Verified',
    images: [...TRIP_PIN_POPUP_IMAGES],
  }
}

export function buildMapPinHover(pin: AgentMapPin, agencyName: string): TripHoverCard {
  const hi = tripImagesHiRes(TRIP_PIN_POPUP_IMAGES)
  return {
    heroImage: hi[0] ?? TRIP_PIN_POPUP_IMAGES[0],
    rating: 4.9,
    reviewLabel: '(platform verified)',
    category: 'Verified destination',
    locationLine: pin.city,
    teaser: `${agencyName} completed ${pin.count} verified hotel bookings here in the last 90 days on TravelConnect.`,
    mentionedBy: 'TravelConnect platform data',
  }
}

export function buildMapPinSidePanel(pin: AgentMapPin, agencyName: string): TripSidePanel {
  const hi = tripImagesHiRes(TRIP_PIN_POPUP_IMAGES)
  const hero = hi[0] ?? TRIP_PIN_POPUP_IMAGES[0]
  const gallery = hi.slice(0, 4)

  return {
    heroImage: hero,
    gallery,
    rating: 4.9,
    reviewLabel: 'Verified volume',
    category: 'Destination expertise',
    locationLine: `${pin.city} · ${pin.count} bookings (90d)`,
    overview: `${agencyName} is a verified TravelConnect partner with documented booking volume in ${pin.city}. This destination appears in their live 90-day hotel booking history — not self-reported marketing copy.`,
    days: [
      {
        day: 1,
        title: `Platform record · ${pin.city}`,
        summary: `${pin.count} hotel bookings attributed to this agency in the reporting window.`,
        blocks: [
          {
            emoji: '📊',
            label: 'Verified volume',
            segments: [
              {
                text: `${agencyName} routed ${pin.count} confirmed hotel bookings through TravelConnect for ${pin.city}. Data is aggregated from the agency C360 profile.`,
              },
            ],
          },
          {
            emoji: '📍',
            label: 'Why this matters',
            segments: [
              {
                text: `Repeat destination expertise reduces risk for your itinerary — this agency has recent, platform-backed activity in ${pin.city}.`,
              },
            ],
          },
        ],
      },
    ],
  }
}

/** Circle radius (px) scaled by booking count for Leaflet markers. */
export function mapPinRadius(count: number, selected: boolean): number {
  const base = 6 + Math.min(Math.sqrt(count) * 2.2, 14)
  return selected ? base + 4 : base
}

export function mapPinOpacity(count: number, selected: boolean): number {
  if (selected) return 1
  const max = 0.95
  const min = 0.55
  const t = Math.min(count / 50, 1)
  return min + (max - min) * t
}
