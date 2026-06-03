import { NextResponse } from 'next/server'
import path from 'path'
import { getCachedAgencyProfile, cacheAgencyProfiles } from '@/lib/agencyProfileCache.server'
import { getMatchDb } from '@/lib/matchAgenciesStage1'
import { resolveCityCoords } from '@/lib/cityGeocodes'
import type { AgentProfile } from '@/lib/agencyDataProcessor'

const DB_PATH = path.join(process.cwd(), 'data', 'match.db')

/**
 * Rebuilds mapPins from bookingCities using the server-side city geocoder.
 * The SQLite indexer stores mapPins as [] to avoid bundling cityGeocodes on the indexer side;
 * we rehydrate them here so the Leaflet map renders correctly.
 */
function rehydrateMapPins(profile: AgentProfile): AgentProfile {
  if (profile.mapPins && profile.mapPins.length > 0) return profile
  const mapPins = (profile.bookingCities ?? []).flatMap(({ city, count }) => {
    const coords = resolveCityCoords(city)
    if (!coords) return []
    return [{ city, count, lat: coords[0], lng: coords[1] }]
  })
  return { ...profile, mapPins }
}

/**
 * GET /api/agency-profile?agencyId=50329
 * Returns a single cached or SQLite-retrieved AgentProfile.
 */
export async function GET(request: Request) {
  const agencyId = Number(new URL(request.url).searchParams.get('agencyId'))
  if (!Number.isFinite(agencyId) || agencyId <= 0) {
    return NextResponse.json({ error: 'Invalid agencyId' }, { status: 400 })
  }

  const cached = getCachedAgencyProfile(agencyId)
  if (cached) {
    return NextResponse.json({ profile: cached })
  }

  try {
    const db = getMatchDb(DB_PATH)
    const row = db.prepare('SELECT data FROM agencies WHERE id = ?').get(agencyId) as { data: string } | undefined
    if (row) {
      const profile = rehydrateMapPins(JSON.parse(row.data) as AgentProfile)
      cacheAgencyProfiles([profile])
      return NextResponse.json({ profile })
    }
    return NextResponse.json({ profile: null })
  } catch (err) {
    console.error('[agency-profile] SQLite lookup failed:', err)
    return NextResponse.json({ profile: null }, { status: 500 })
  }
}

