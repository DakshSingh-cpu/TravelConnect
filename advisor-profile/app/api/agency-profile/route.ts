import { NextResponse } from 'next/server'
import { processAgencyDataStream } from '@/lib/agencyDataProcessor.server'
import { getAgencyCsvPath, getCachedAgencyProfile } from '@/lib/agencyProfileCache.server'

/**
 * GET /api/agency-profile?agencyId=50329
 * Returns a single cached or streamed AgentProfile (client fallback when session has no copy).
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
    const profiles = await processAgencyDataStream(getAgencyCsvPath(), [agencyId])
    return NextResponse.json({ profile: profiles[0] ?? null })
  } catch (err) {
    console.error('[agency-profile] CSV lookup failed:', err)
    return NextResponse.json({ profile: null }, { status: 500 })
  }
}
