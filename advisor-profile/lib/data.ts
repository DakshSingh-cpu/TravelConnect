// ─── Data: Priya Rajan ──────────────────────────────────────────────────────

export const advisor = {
  name: 'Priya Rajan',
  initials: 'PR',
  title: 'TravelConnect Gold Advisor · Europe Specialist',
  location: 'Mumbai',
  languages: ['Hindi', 'English', 'French'],
  rating: 4.9,
  reviewCount: 127,
  yearsExperience: 14,
  repeatClientRate: 94,
  totalBookings: 127,
  matchScore: 94,
  matchContext: 'for your Europe family trip',
  specialisations: [
    'Western Europe',
    'Mediterranean',
    'Luxury Family Trips',
    'Honeymoon Packages',
    'Heritage Routes',
    'Slow Travel',
    'Rail-first Europe',
  ],
  bio: [
    "I've spent 14 years turning the idea of Europe into a deeply personal experience for Indian families, couples, and solo travellers. My philosophy is simple: slow down. I won't pack your day with ten museums and four transfers. I build itineraries that give you two hours over lunch in a quiet piazza, spontaneous walks down cobblestone streets, and evenings where you feel like a local — not a tourist.",
    "Every trip I design starts with a conversation, not a form. I learn your pace, your non-negotiables, and even your anxieties. I handle the train timings, the hotel upgrades, and the backup plans — so that all you have to do is show up and experience it. My clients come back year after year, not because I sell trips, but because I understand how to translate their dream into a seamless, memorable reality.",
  ],
}

// ─── Data: Trip Map Pins ─────────────────────────────────────────────────────

export interface TripPin {
  id: string
  city: string
  lat: number
  lng: number
  route: string
  duration: string
  type: string
  images: string[]
}

/** Shared premium mock photos (2×2 popup grid): Paris, Rome, Swiss Alps, Tuscany */
export const TRIP_PIN_POPUP_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=300&q=80',
]

export const tripPins: TripPin[] = [
  {
    id: '1',
    city: 'Paris',
    lat: 48.8566,
    lng: 2.3522,
    route: 'Paris → Swiss Alps → Rome',
    duration: '16 days · Family of 4',
    type: 'Family',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '2',
    city: 'Rome',
    lat: 41.9028,
    lng: 12.4964,
    route: 'Rome · Colosseum & Amalfi day trip',
    duration: '5 days · Couple',
    type: 'Couple',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '3',
    city: 'Barcelona',
    lat: 41.3851,
    lng: 2.1734,
    route: 'Barcelona → Amalfi → Santorini',
    duration: '14 days · Couple',
    type: 'Couple',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '4',
    city: 'Santorini',
    lat: 36.3932,
    lng: 25.4615,
    route: 'Santorini Honeymoon',
    duration: '7 days · Couple',
    type: 'Honeymoon',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '5',
    city: 'Amsterdam',
    lat: 52.3676,
    lng: 4.9041,
    route: 'Amsterdam → Rhine Valley → Vienna',
    duration: '18 days · Family of 5',
    type: 'Family',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '6',
    city: 'Vienna',
    lat: 48.2082,
    lng: 16.3738,
    route: 'Vienna & Salzburg',
    duration: '8 days · Solo',
    type: 'Solo',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '7',
    city: 'Florence',
    lat: 43.7696,
    lng: 11.2558,
    route: 'Tuscany & Cinque Terre',
    duration: '12 days · Couple',
    type: 'Couple',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '8',
    city: 'Prague',
    lat: 50.0755,
    lng: 14.4378,
    route: 'Prague → Budapest',
    duration: '10 days · Friends group',
    type: 'Group',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '9',
    city: 'Amalfi',
    lat: 40.634,
    lng: 14.6027,
    route: 'Amalfi Coast circuit',
    duration: '6 days · Honeymoon',
    type: 'Honeymoon',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
  {
    id: '10',
    city: 'Zurich',
    lat: 47.3769,
    lng: 8.5417,
    route: 'Swiss Alps & Lakes',
    duration: '9 days · Family of 4',
    type: 'Family',
    images: [...TRIP_PIN_POPUP_IMAGES],
  },
]

// ─── Data: Recent Trips ───────────────────────────────────────────────────────

export interface Trip {
  id: string
  route: string
  duration: string
  groupType: string
  date: string
  vibes: string[]
  stars: number
  review: string
  reviewer: string
}

export const recentTrips: Trip[] = [
  {
    id: '1',
    route: 'Paris → Swiss Alps → Rome',
    duration: '16 days',
    groupType: 'Family of 4',
    date: 'April 2026',
    vibes: ['Relaxed Pace', 'Culture Heavy', 'Kid-Friendly'],
    stars: 5,
    review: 'Priya planned everything down to the train timings. The kids had their own activity bags. We just showed up and enjoyed.',
    reviewer: 'Rohan & Meena S.',
  },
  {
    id: '2',
    route: 'Barcelona → Amalfi → Santorini',
    duration: '14 days',
    groupType: 'Couple',
    date: 'February 2026',
    vibes: ['Romantic', 'Boutique Stays', 'Coastal'],
    stars: 5,
    review: 'She was completely transparent — every cost, every backup option. Never felt out of control.',
    reviewer: 'Ananya I.',
  },
  {
    id: '3',
    route: 'Amsterdam → Rhine Valley → Vienna',
    duration: '18 days',
    groupType: 'Family of 5',
    date: 'December 2025',
    vibes: ['Slow Travel', 'Rail-first', 'Winter Magic'],
    stars: 5,
    review: 'Our 10-year-old still talks about the Rhine boat. She knew exactly what would make it memorable for kids.',
    reviewer: 'The Kapoor Family',
  },
  {
    id: '4',
    route: 'Tuscany & Cinque Terre',
    duration: '12 days',
    groupType: 'Couple',
    date: 'October 2025',
    vibes: ['Luxury Stays', 'Food & Wine', 'Slow Travel'],
    stars: 5,
    review: 'She saved us ₹2L on hotels alone by knowing exactly which properties to work with.',
    reviewer: 'Nisha & Dev M.',
  },
]

// ─── Data: Reviews ────────────────────────────────────────────────────────────

export interface Review {
  id: string
  name: string
  tripContext: string
  quote: string
  stars: number
}

export const reviews: Review[] = [
  {
    id: '1',
    name: 'Rohan & Meena Sharma',
    tripContext: 'Family of 4 · Europe 16 days',
    quote: 'We were nervous about spending so much on a single trip. Priya built us a detailed day-by-day plan with costs upfront. No surprises, no anxiety — just an incredible holiday.',
    stars: 5,
  },
  {
    id: '2',
    name: 'Ananya Iyer',
    tripContext: 'Honeymoon Couple · Amalfi & Santorini',
    quote: 'Flight delayed by 6 hours. Priya had rebooked our hotel and arranged a private transfer before we even landed. That\'s crisis management. We\'ll only ever book through her.',
    stars: 5,
  },
]
