import { useEffect, useState } from 'react'
import { fetchCityImage } from '@/lib/unsplashImage'

/**
 * Fetches a high-quality city image from Unsplash.
 * Results are cached in-memory so repeated hovers never re-fetch.
 */
export function useCityImage(cityName: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setIsLoading(true)
    setImageUrl(null)

    fetchCityImage(cityName).then((url) => {
      if (alive) {
        setImageUrl(url)
        setIsLoading(false)
      }
    })

    return () => {
      alive = false
    }
  }, [cityName])

  return { imageUrl, isLoading }
}
