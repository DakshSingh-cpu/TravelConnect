/**
 * Fetches a high-quality travel/landmark image for a given city from Unsplash.
 * Uses an in-memory cache so each city is only fetched once per page session,
 * keeping usage well within the free-tier 50 req/hr limit.
 */

const imageCache = new Map<string, string>()

/** Deterministic fallback images for when the API is unavailable. */
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
]

function getFallback(city: string): string {
  let hash = 0
  for (let i = 0; i < city.length; i++) {
    hash = city.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length]
}

export async function fetchCityImage(city: string): Promise<string> {
  const key = city.trim().toLowerCase()

  if (imageCache.has(key)) {
    return imageCache.get(key)!
  }

  const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    const fallback = getFallback(key)
    imageCache.set(key, fallback)
    return fallback
  }

  try {
    const query = encodeURIComponent(`${key} travel landmark`)
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
      },
    )

    if (!res.ok) throw new Error(`Unsplash ${res.status}`)

    const json = await res.json()
    const url: string | undefined = json.results?.[0]?.urls?.regular

    if (url) {
      imageCache.set(key, url)
      return url
    }
  } catch {
    // Silently fall through to fallback
  }

  const fallback = getFallback(key)
  imageCache.set(key, fallback)
  return fallback
}
