export type LocationZipFailureReason =
  | 'unsupported'
  | 'denied'
  | 'timeout'
  | 'unavailable'
  | 'no_postcode'

export type LocationZipResult =
  | { ok: true; zip: string }
  | { ok: false; reason: LocationZipFailureReason }

function getUserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10_000,
      maximumAge: 60_000,
    })
  })
}

interface ReverseGeocodeResponse {
  postcode?: string
  countryCode?: string
}

function normalizePostcode(postcode: string, countryCode: string): string | null {
  const digits = postcode.replace(/\D/g, '')
  if (countryCode === 'IN') {
    return digits.length === 6 ? digits : null
  }
  const trimmed = postcode.replace(/\s/g, '')
  return trimmed.length > 0 ? trimmed : null
}

async function reverseGeocodePostcode(lat: number, lng: number): Promise<string | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  const res = await fetch(url)
  if (!res.ok) return null

  const data = (await res.json()) as ReverseGeocodeResponse
  if (!data.postcode) return null

  return normalizePostcode(data.postcode, data.countryCode ?? '')
}

function mapGeolocationError(err: unknown): LocationZipFailureReason {
  const geoErr = err as GeolocationPositionError
  if ('code' in geoErr) {
    if (geoErr.code === 1) return 'denied'
    if (geoErr.code === 3) return 'timeout'
  }
  return 'unavailable'
}

/** Requests browser location permission and resolves a residential postal code. */
export async function requestResidentialZipFromLocation(): Promise<LocationZipResult> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { ok: false, reason: 'unsupported' }
  }

  try {
    const position = await getUserPosition()
    const zip = await reverseGeocodePostcode(position.coords.latitude, position.coords.longitude)
    if (!zip) return { ok: false, reason: 'no_postcode' }
    return { ok: true, zip }
  } catch (err) {
    return { ok: false, reason: mapGeolocationError(err) }
  }
}
