import { advisor, reviews } from '@/lib/data'

/** Public advisor index for crawlers and `/advisors` directory page. */
export type DirectoryAdvisor = {
  id: string
  name: string
  title: string
  location: string
  rating: number
  reviewCount: number
  specialisations: string[]
  bio: string
  photoUrl: string
  profilePath: string
  hasFullProfile: boolean
}

const PRIYA_BIO = advisor.bio.join(' ')

export const advisorsDirectory: DirectoryAdvisor[] = [
  {
    id: 'priya-rajan',
    name: advisor.name,
    title: advisor.title,
    location: advisor.location,
    rating: advisor.rating,
    reviewCount: advisor.reviewCount,
    specialisations: advisor.specialisations,
    bio: PRIYA_BIO,
    photoUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
    profilePath: '/advisor/priya-rajan',
    hasFullProfile: true,
  },
  {
    id: 'elena-vogt',
    name: 'Elena Vogt',
    title: 'Senior Advisor · Alps & Mediterranean',
    location: 'Zurich',
    rating: 4.8,
    reviewCount: 89,
    specialisations: [
      'Swiss Alps',
      'Mediterranean Coast',
      'Luxury Family Trips',
      'Ski & Winter',
      'Boutique Hotels',
    ],
    bio: 'Elena designs Alps and Mediterranean itineraries with calm pacing and transparent budgeting for Indian outbound travelers.',
    photoUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
    profilePath: '/advisor/elena-vogt',
    hasFullProfile: false,
  },
  {
    id: 'marcus-bell',
    name: 'Marcus Bell',
    title: 'Luxury Rail & Heritage Routes',
    location: 'London',
    rating: 4.7,
    reviewCount: 64,
    specialisations: [
      'Rail-first Europe',
      'Heritage Routes',
      'Slow Travel',
      'Multi-city Routing',
      'Cultural Deep Dives',
    ],
    bio: 'Marcus specializes in rail-first European journeys and heritage corridors with logistics handled end to end.',
    photoUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
    profilePath: '/advisor/marcus-bell',
    hasFullProfile: false,
  },
]

export function getAdvisorById(id: string): DirectoryAdvisor | undefined {
  return advisorsDirectory.find((a) => a.id === id)
}

export function getPriyaReviews() {
  return reviews
}
