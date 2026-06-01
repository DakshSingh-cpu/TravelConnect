import fs from 'fs'
import Papa from 'papaparse'
import {
  mergeAgencyRows,
  transformAgencyRow,
  type AgentProfile,
  type RawAgencyRow,
} from '@/lib/agencyDataProcessor'
import {
  cacheAgencyProfiles,
  getCachedAgencyProfiles,
} from '@/lib/agencyProfileCache.server'
import {
  readTopAgencyIdsFromDisk,
  writeTopAgencyIdsToDisk,
} from '@/lib/agencyRankingsDiskCache.server'

/**
 * Streams the CSV and extracts rows for the requested Agency IDs.
 * Merges every duplicate row per ID (city booking maps are unioned) before transforming.
 */
export function processAgencyDataStream(
  csvFilePath: string,
  agencyIds: number[],
): Promise<AgentProfile[]> {
  const uniqueIds = [...new Set(agencyIds.filter((id) => id > 0))]
  const cached = getCachedAgencyProfiles(uniqueIds)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve, reject) => {
    const idSet = new Set(uniqueIds.map(String))
    const matchedById = new Map<string, AgentProfile>()
    const rawById = new Map<string, RawAgencyRow>()

    if (idSet.size === 0) {
      return resolve([])
    }

    const fileStream = fs.createReadStream(csvFilePath)

    const finish = (profiles: AgentProfile[]) => {
      cacheAgencyProfiles(profiles)
      resolve(profiles)
    }

    const ingestRow = (row: RawAgencyRow) => {
      const agencyId = row['Agency ID']
      const prevRaw = rawById.get(agencyId)
      const mergedRaw = prevRaw ? mergeAgencyRows(prevRaw, row) : row
      rawById.set(agencyId, mergedRaw)
      matchedById.set(agencyId, transformAgencyRow(mergedRaw))
    }

    Papa.parse<RawAgencyRow>(fileStream, {
      header: true,
      skipEmptyLines: true,
      step(results) {
        const agencyId = results.data['Agency ID']
        if (!idSet.has(agencyId)) return
        ingestRow(results.data)
      },
      complete() {
        finish(Array.from(matchedById.values()))
      },
      error(err: unknown) {
        reject(err)
      },
    })
  })
}

let rankedAgenciesCache: AgentProfile[] | null = null

function compareByFulfillment(a: AgentProfile, b: AgentProfile): number {
  const fulfillmentDiff = b.tripFulfillmentRate - a.tripFulfillmentRate
  if (fulfillmentDiff !== 0) return fulfillmentDiff
  return a.cancellationRate - b.cancellationRate
}

/**
 * Scans the CSV once (cached) and returns agencies with the highest trip fulfillment /
 * lowest cancellation among partners with booking activity.
 */
export function findTopAgenciesByFulfillment(
  csvFilePath: string,
  limit = 3,
): Promise<AgentProfile[]> {
  if (rankedAgenciesCache) {
    return Promise.resolve(rankedAgenciesCache.slice(0, limit))
  }

  const rankedIds = readTopAgencyIdsFromDisk()
  if (rankedIds) {
    const idsToFetch = rankedIds.slice(0, Math.max(limit, 12))
    return processAgencyDataStream(csvFilePath, idsToFetch).then((profiles) => {
      const ordered = rankedIds
        .map((id) => profiles.find((p) => p.agencyId === id))
        .filter((p): p is AgentProfile => Boolean(p))
        .slice(0, limit)
      rankedAgenciesCache = ordered
      return ordered
    })
  }

  return new Promise((resolve, reject) => {
    const rawByAgencyId = new Map<string, RawAgencyRow>()

    const fileStream = fs.createReadStream(csvFilePath)

    Papa.parse<RawAgencyRow>(fileStream, {
      header: true,
      skipEmptyLines: true,
      step(results) {
        const agencyId = results.data['Agency ID']
        if (!agencyId) return

        const prev = rawByAgencyId.get(agencyId)
        rawByAgencyId.set(
          agencyId,
          prev ? mergeAgencyRows(prev, results.data) : results.data,
        )
      },
      complete() {
        const profiles: AgentProfile[] = []
        for (const raw of rawByAgencyId.values()) {
          const profile = transformAgencyRow(raw)
          const hasSignal =
            profile.totalVerifiedTrips > 0 &&
            (profile.tripFulfillmentRate > 0 || profile.cancellationRate > 0)
          if (hasSignal) profiles.push(profile)
        }
        rankedAgenciesCache = profiles.sort(compareByFulfillment)
        cacheAgencyProfiles(rankedAgenciesCache)
        writeTopAgencyIdsToDisk(rankedAgenciesCache.map((p) => p.agencyId))
        resolve(rankedAgenciesCache.slice(0, limit))
      },
      error(err: unknown) {
        reject(err)
      },
    })
  })
}
