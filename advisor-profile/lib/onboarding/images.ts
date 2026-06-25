import { STEPS } from './steps'

export function getStepImageUrl(stepIndex: number): string {
  return STEPS[stepIndex]?.imageUrl ?? STEPS[0].imageUrl
}

export function getStepImageAlt(stepIndex: number): string {
  return STEPS[stepIndex]?.imageAlt ?? 'Travel destination'
}

export function getAdjacentImageUrls(currentIndex: number): string[] {
  const urls: string[] = []
  if (currentIndex + 1 < STEPS.length) urls.push(STEPS[currentIndex + 1].imageUrl)
  if (currentIndex + 2 < STEPS.length) urls.push(STEPS[currentIndex + 2].imageUrl)
  return urls
}

// ── Companion-specific images for Step 3 ──────────────────────────────────

export const COMPANION_IMAGES: Record<string, { url: string; alt: string }> = {
  solo: {
    url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
    alt: 'Solo traveller on an open road adventure',
  },
  partner: {
    url: 'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?auto=format&fit=crop&w=1200&q=80',
    alt: 'Couple travelling together on vacation',
  },
  kids: {
    url: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?auto=format&fit=crop&w=1200&q=80',
    alt: 'Family with children enjoying a trip',
  },
  friends: {
    url: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1200&q=80',
    alt: 'Group of friends travelling together',
  },
}

// ── Destination-specific images for Step 1 hover/select ───────────────────

export const DESTINATION_IMAGES: Record<string, { url: string; alt: string }> = {
  Europe: {
    url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
    alt: 'European architecture and culture',
  },
  'Southeast Asia': {
    url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    alt: 'Southeast Asian temples and islands',
  },
  Japan: {
    url: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=80',
    alt: 'Japanese torii gate',
  },
  Maldives: {
    url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80',
    alt: 'Maldives overwater bungalows',
  },
  'Africa Safari': {
    url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
    alt: 'African safari wildlife',
  },
  'Surprise me': {
    url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
    alt: 'Open road adventure',
  },
}

// ── Vibe-specific images for Step 2 (TripVibe) ────────────────────────────

export const VIBE_IMAGES: Record<string, { url: string; alt: string }> = {
  scenic_nature: {
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Lush green forest with sunlight filtering through trees',
  },
  somewhere_warm: {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Tropical beach with clear blue water',
  },
  city_culture: {
    url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
    alt: 'Busy city street with skyscrapers and architecture',
  },
  beach_islands: {
    url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=1200&q=80',
    alt: 'Crystal clear turquoise island waters',
  },
  mountains: {
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    alt: 'Mountain peaks at sunrise with alpine glow',
  },
  coastal_escape: {
    url: 'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?auto=format&fit=crop&w=1200&q=80',
    alt: 'Dramatic coastal cliffs overlooking the sea',
  },
  surprise_me: {
    url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
    alt: 'Open road winding through scenic landscape',
  },
}

// ── Service-level-specific images for Step 5 ──────────────────────────────

export const SERVICE_LEVEL_IMAGES: Record<string, { url: string; alt: string }> = {
  hotel: {
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    alt: 'Luxury hotel infinity pool at sunset',
  },
  cruise: {
    url: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=80',
    alt: 'Cruise ship sailing at sea',
  },
  full_itinerary: {
    url: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1200&q=80',
    alt: 'Globe and travel maps for full trip planning',
  },
  flights_only: {
    url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80',
    alt: 'Aerial view from above the clouds',
  },
  other: {
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    alt: 'People collaborating on travel plans',
  },
}

// ── Priority-specific images for Step 6 ───────────────────────────────────

export const PRIORITY_IMAGES: Record<string, { url: string; alt: string }> = {
  safari: {
    url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
    alt: 'Safari jeep watching wildlife at sunset in Africa',
  },
  honeymoon: {
    url: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?auto=format&fit=crop&w=1200&q=80',
    alt: 'Romantic overwater bungalow for a honeymoon',
  },
  accessibility: {
    url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
    alt: 'Accessible coastal boardwalk path',
  },
  wellness: {
    url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    alt: 'Peaceful spa and wellness retreat',
  },
  adventure: {
    url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80',
    alt: 'Hiker on a mountain ridge at sunrise',
  },
  foodie: {
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    alt: 'Beautifully plated gourmet meal at a restaurant',
  },
  family_friendly: {
    url: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80',
    alt: 'Family enjoying a beach vacation together',
  },
  pet_friendly: {
    url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    alt: 'Dog running freely on a nature trail',
  },
}
