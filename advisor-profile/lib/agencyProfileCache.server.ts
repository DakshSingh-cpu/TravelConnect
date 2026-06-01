import 'server-only'

import { join } from 'path'
import type { AgentProfile } from '@/lib/agencyDataProcessor'

/** In-memory cache — avoids re-scanning the 1M+ row CSV on every navigation. */
const byAgencyId = new Map<number, AgentProfile>()

export function getCachedAgencyProfile(agencyId: number): AgentProfile | undefined {
  return byAgencyId.get(agencyId)
}

export function getCachedAgencyProfiles(agencyIds: number[]): AgentProfile[] | null {
  const profiles: AgentProfile[] = []
  for (const id of agencyIds) {
    const profile = byAgencyId.get(id)
    if (!profile) return null
    profiles.push(profile)
  }
  return profiles
}

export function cacheAgencyProfiles(profiles: AgentProfile[]): void {
  for (const profile of profiles) {
    byAgencyId.set(profile.agencyId, profile)
  }
}

export function getAgencyCsvPath(): string {
  return join(process.cwd(), '..', 'query_result_2026-05-22T05_23_26.420933Z.csv')
}
