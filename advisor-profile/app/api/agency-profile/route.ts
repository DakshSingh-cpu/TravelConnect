import { NextResponse } from 'next/server'
import path from 'path'
import { getCachedAgencyProfile, cacheAgencyProfiles } from '@/lib/agencyProfileCache.server'
import { getMatchDb } from '@/lib/matchAgenciesStage1'

const DB_PATH = path.join(process.cwd(), 'data', 'match.db')

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
      const profile = JSON.parse(row.data)
      cacheAgencyProfiles([profile])
      return NextResponse.json({ profile })
    }
    return NextResponse.json({ profile: null })
  } catch (err) {
    console.error('[agency-profile] SQLite lookup failed:', err)
    return NextResponse.json({ profile: null }, { status: 500 })
  }
}
