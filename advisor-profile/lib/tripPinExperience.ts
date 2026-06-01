import type { TripPin } from '@/lib/data'

/** High-res variants for hero / panel (same photos, larger width) */
export function tripImagesHiRes(urls: string[]): string[] {
  return urls.map((u) => u.replace('w=300', 'w=900').replace('w=400', 'w=900'))
}

export interface TripPlaceHover {
  id: string
  name: string
  tag: string
  blurb: string
  image: string
}

export interface TripItinerarySegment {
  text?: string
  place?: TripPlaceHover
}

export interface TripItineraryBlock {
  emoji: string
  label: string
  segments: TripItinerarySegment[]
}

export interface TripItineraryDay {
  day: number
  title: string
  summary: string
  blocks: TripItineraryBlock[]
}

export interface TripHoverCard {
  heroImage: string
  rating: number
  reviewLabel: string
  category: string
  locationLine: string
  teaser: string
  mentionedBy: string
}

export interface TripSidePanel {
  heroImage: string
  gallery: string[]
  rating: number
  reviewLabel: string
  category: string
  locationLine: string
  overview: string
  days: TripItineraryDay[]
}

const IMG = {
  dining: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80',
  museum: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=600&q=80',
  train: 'https://images.unsplash.com/photo-1474487548417-781cb714cb99?auto=format&fit=crop&w=600&q=80',
  spa: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
}

const HOTEL = 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=600&q=80'

function place(
  pinId: string,
  suffix: string,
  name: string,
  tag: string,
  blurb: string,
  image: string,
): TripPlaceHover {
  return { id: `p-${pinId}-${suffix}`, name, tag, blurb, image }
}

function typeCategory(type: string): string {
  if (type === 'Family') return 'Family journey'
  if (type === 'Honeymoon') return 'Honeymoon escape'
  if (type === 'Solo') return 'Solo discovery'
  if (type === 'Group') return 'Group adventure'
  if (type === 'Couple') return 'Couple experience'
  return 'Curated trip'
}

export function buildTripHover(pin: TripPin): TripHoverCard {
  const hi = tripImagesHiRes(pin.images)
  const seed = parseInt(pin.id, 10) || 1
  const rating = 4.35 + (seed % 7) * 0.08
  const reviews = ['2.1k', '18k', '106k', '4.8k', '12k', '9.4k', '6.2k', '3.3k', '8.1k', '15k']
  return {
    heroImage: hi[0] ?? pin.images[0],
    rating: Math.round(rating * 10) / 10,
    reviewLabel: `(${reviews[(seed - 1) % reviews.length]})`,
    category: typeCategory(pin.type),
    locationLine: `${pin.city} · Europe`,
    teaser: `A ${pin.type.toLowerCase()} routing Priya has delivered before — paced for real life, not brochure checklists.`,
    mentionedBy: 'Mentioned by TravelConnect travellers',
  }
}

export function buildTripSidePanel(pin: TripPin): TripSidePanel {
  const hi = tripImagesHiRes(pin.images)
  const hero = hi[0] ?? pin.images[0]
  const gallery = (hi.length >= 4 ? hi.slice(0, 4) : [...hi, ...pin.images]).slice(0, 4)

  const seed = parseInt(pin.id, 10) || 1
  const rating = 4.45 + (seed % 6) * 0.07
  const reviews = ['18k', '106k', '4.8k', '12k', '9.4k', '6.2k', '3.3k', '8.1k', '15k', '22k']

  const h = (name: string, tag: string, blurb: string, image: string) =>
    place(pin.id, `${name}-${tag}`.replace(/\s+/g, '-'), name, tag, blurb, image)

  const days: TripItineraryDay[] = [
    {
      day: 1,
      title: `Arrival · ${pin.city}`,
      summary: 'Private transfer, easy check-in, and a soft first evening so nobody hits a wall.',
      blocks: [
        {
          emoji: '✈️',
          label: 'Flight & transfer',
          segments: [
            { text: 'Meet-and-greet on arrival, luggage handled, and a direct transfer to ' },
            {
              place: h(
                'The Residence · Old Town',
                'Hotel',
                'Quiet rooms, blackout curtains, and a concierge team that speaks Hindi & English. Priya blocks interconnecting rooms for families when available.',
                HOTEL,
              ),
            },
            { text: '.' },
          ],
        },
        {
          emoji: '🌙',
          label: 'Evening',
          segments: [
            { text: 'Sunset walk and light dinner near ' },
            {
              place: h(
                'Piazza & Promenade',
                'Neighbourhood',
                'Low-stress first night: short stroll, gelato or café stop, and early bedtime for jet lag recovery.',
                pin.images[3] ?? pin.images[0],
              ),
            },
            { text: '.' },
          ],
        },
      ],
    },
    {
      day: 2,
      title: `Icons · ${pin.route.split(/[→·]/)[0]?.trim() ?? pin.city}`,
      summary: 'Culture without chaos — timed entries, skip-the-line where it matters, and buffer time.',
      blocks: [
        {
          emoji: '☀️',
          label: 'Morning',
          segments: [
            { text: 'Guided highlights including ' },
            {
              place: h(
                'Heritage Circuit',
                'Attraction',
                'Story-led touring with headsets, paced for kids and grandparents. Rest stops baked in every 90 minutes.',
                IMG.museum,
              ),
            },
            { text: ' and local coffee.' },
          ],
        },
        {
          emoji: '🎨',
          label: 'Afternoon',
          segments: [
            { text: 'Free hours or optional ' },
            {
              place: h(
                'Atelier & Tasting',
                'Experience',
                'Hands-on session (chocolate, perfume, or wine — matched to your group). Private tables reserved.',
                IMG.dining,
              ),
            },
            { text: '.' },
          ],
        },
        {
          emoji: '🌙',
          label: 'Evening',
          segments: [
            { text: 'Reservation at ' },
            {
              place: h(
                'Riverfront Dining',
                'Restaurant',
                'Chef’s choice menus with dietary notes sent ahead. Late seating available for slow travellers.',
                IMG.dining,
              ),
            },
            { text: '.' },
          ],
        },
      ],
    },
    {
      day: 3,
      title: 'Scenic day · trains & views',
      summary: 'Rail-first routing where Priya controls seat maps, platform changes, and contingency taxis.',
      blocks: [
        {
          emoji: '☀️',
          label: 'Morning',
          segments: [
            { text: 'Scenic train leg with reserved seats via ' },
            {
              place: h(
                'Rail Desk Support',
                'Logistics',
                'Live WhatsApp support on travel day: platform updates, delay replanning, and hotel notifications.',
                IMG.train,
              ),
            },
            { text: '.' },
          ],
        },
        {
          emoji: '🎨',
          label: 'Afternoon',
          segments: [
            { text: 'Lookout viewpoints and lakeside time — optional ' },
            {
              place: h(
                'Spa & Recovery',
                'Wellness',
                '60–90 minute treatments booked back-to-back for couples; kids’ club slots where properties allow.',
                IMG.spa,
              ),
            },
            { text: '.' },
          ],
        },
      ],
    },
    {
      day: 4,
      title: 'Local depth',
      summary: 'Neighbourhoods, markets, and “living like a local” hours — still fully supported.',
      blocks: [
        {
          emoji: '☀️',
          label: 'Morning',
          segments: [
            { text: 'Market visit with ' },
            {
              place: h(
                'Local Host',
                'Guide',
                'English-speaking host, small group caps, and curated shopping list (no forced purchases).',
                pin.images[2] ?? pin.images[0],
              ),
            },
            { text: '.' },
          ],
        },
        {
          emoji: '🌙',
          label: 'Evening',
          segments: [
            { text: 'Optional jazz / classical night or a quiet ' },
            {
              place: h(
                'Rooftop Sundowner',
                'Venue',
                'Windshield views, mocktails for kids, and a single bill so you never split awkwardly.',
                pin.images[1] ?? pin.images[0],
              ),
            },
            { text: '.' },
          ],
        },
      ],
    },
    {
      day: 5,
      title: 'Departure · smooth exit',
      summary: 'Checkout buffers, VAT paperwork help, and airport timing tuned to your risk tolerance.',
      blocks: [
        {
          emoji: '🚕',
          label: 'Transfer',
          segments: [
            { text: 'Private car to airport or station, coordinated by ' },
            {
              place: h(
                'TravelConnect Ground Team',
                'Logistics',
                'Flight tracking, driver swaps on delays, and hotel late-checkout negotiated when possible.',
                IMG.train,
              ),
            },
            { text: '.' },
          ],
        },
        {
          emoji: '✈️',
          label: 'Homeward',
          segments: [{ text: 'Priority lanes where available and lounge access on select fares — Priya confirms 48h before.' }],
        },
      ],
    },
  ]

  return {
    heroImage: hero,
    gallery,
    rating: Math.round(rating * 10) / 10,
    reviewLabel: `(${reviews[(seed - 1) % reviews.length]})`,
    category: typeCategory(pin.type),
    locationLine: `${pin.city} · ${pin.route}`,
    overview: `${pin.route} — ${pin.duration}. This blueprint is a proven spine Priya adapts month to month: hotels shift, trains stay reliable, and pacing matches your party. Every stop below links to notes, photos, and backup options she keeps on file.`,
    days,
  }
}
