import 'server-only'

import fs from 'fs'
import path from 'path'

const CACHE_FILE = path.join(process.cwd(), 'data', 'agency-rankings.json')

/** Sorted agency IDs (best fulfillment first) — small file for instant match loads. */
export function readTopAgencyIdsFromDisk(): number[] | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const ids = parsed
      .map((entry) => (typeof entry === 'number' ? entry : (entry as { agencyId?: number })?.agencyId))
      .filter((id): id is number => typeof id === 'number' && id > 0)
    return ids.length > 0 ? ids : null
  } catch {
    return null
  }
}

export function writeTopAgencyIdsToDisk(agencyIds: number[]): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(agencyIds), 'utf8')
}

export function agencyRankingsCachePath(): string {
  return CACHE_FILE
}
