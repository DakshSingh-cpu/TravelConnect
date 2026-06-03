import AdvisorJsonLd from '@/components/seo/AdvisorJsonLd'
import AdvisorProfileStub from '@/components/advisor/AdvisorProfileStub'
import AdvisorProfileWithData from '@/components/advisor/AdvisorProfileWithData'
import { getAdvisorById } from '@/lib/advisorsDirectory'
import {
  buildMockMatchedAdvisors,
  defaultIntakePayload,
  parseAgencyIdFromAdvisorRoute,
  type MatchedAdvisor,
} from '@/lib/matchAdvisors'
import path from 'path'
import { getCachedAgencyProfile, cacheAgencyProfiles } from '@/lib/agencyProfileCache.server'
import { getMatchDb } from '@/lib/matchAgenciesStage1'
import { resolveCityCoords } from '@/lib/cityGeocodes'
import type { AgentProfile } from '@/lib/agencyDataProcessor'

const DB_PATH = path.join(process.cwd(), 'data', 'match.db')

function rehydrateMapPins(profile: AgentProfile): AgentProfile {
  if (profile.mapPins && profile.mapPins.length > 0) return profile
  const mapPins = (profile.bookingCities ?? []).flatMap(({ city, count }) => {
    const coords = resolveCityCoords(city)
    if (!coords) return []
    return [{ city, count, lat: coords[0], lng: coords[1] }]
  })
  return { ...profile, mapPins }
}

async function fetchAgencyProfileServer(agencyId: number): Promise<AgentProfile | null> {
  const cached = getCachedAgencyProfile(agencyId)
  if (cached) return cached
  try {
    const db = getMatchDb(DB_PATH)
    const row = db.prepare('SELECT data FROM agencies WHERE id = ?').get(agencyId) as { data: string } | undefined
    if (row) {
      const profile = rehydrateMapPins(JSON.parse(row.data) as AgentProfile)
      cacheAgencyProfiles([profile])
      return profile
    }
    return null
  } catch {
    return null
  }
}

type Props = {
  params: Promise<{ advisorId: string }>
}

export default async function AdvisorDynamicPage({ params }: Props) {
  const { advisorId } = await params
  const directoryEntry = getAdvisorById(advisorId)

  const legacyMatch = buildMockMatchedAdvisors(defaultIntakePayload()).find((m) => m.id === advisorId)
  if (legacyMatch) {
    return (
      <>
        <AdvisorJsonLd advisorId={advisorId} />
        <AdvisorProfileWithData persona={legacyMatch} csvAgencyId={legacyMatch.csvAgencyId} />
      </>
    )
  }

  const csvAgencyId = parseAgencyIdFromAdvisorRoute(advisorId)
  if (csvAgencyId) {
    // Fetch server-side so the real agency name is available immediately (no flash of 'Travel Advisor')
    const serverProfile = await fetchAgencyProfileServer(csvAgencyId)
    const persona: MatchedAdvisor = {
      id: advisorId,
      name: serverProfile?.agencyName ?? 'Travel Advisor',
      title: serverProfile
        ? `TravelConnect Verified Partner · ${serverProfile.city}, ${serverProfile.country}`
        : 'TravelConnect Verified Partner',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
      matchScore: 88,
      llmContext: 'Verified TravelConnect travel partner.',
      csvAgencyId,
    }
    return (
      <>
        <AdvisorJsonLd advisorId={advisorId} />
        <AdvisorProfileWithData persona={persona} csvAgencyId={csvAgencyId} />
      </>
    )
  }

  return (
    <>
      <AdvisorJsonLd advisorId={advisorId} />
      <AdvisorProfileStub advisorId={advisorId} displayName={directoryEntry?.name} />
    </>
  )
}
