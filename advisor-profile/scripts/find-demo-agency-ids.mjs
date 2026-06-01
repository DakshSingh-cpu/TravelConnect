/**
 * Temporary scanner: find Agency IDs with fully populated demo metrics
 * in the first N rows of the C360 CSV export.
 *
 * Usage: npx tsx scripts/find-demo-agency-ids.mjs
 */
import fs from 'fs'
import readline from 'readline'
import Papa from 'papaparse'
import { mergeAgencyRows, transformAgencyRow } from '../lib/agencyDataProcessor.ts'

const CSV_PATH = new URL(
  '../../query_result_2026-05-22T05_23_26.420933Z.csv',
  import.meta.url,
)
const MAX_DATA_ROWS = 5000

function rowFromLine(header, line) {
  const h = Papa.parse(header).data[0]
  const v = Papa.parse(line).data[0]
  /** @type {Record<string, string>} */
  const row = {}
  h.forEach((key, i) => {
    row[key] = v[i] ?? ''
  })
  return row
}

const byAgencyId = new Map()
let header = null
let dataRows = 0

const rl = readline.createInterface({
  input: fs.createReadStream(CSV_PATH, { encoding: 'utf8' }),
})

for await (const line of rl) {
  if (!header) {
    header = line
    continue
  }
  if (dataRows >= MAX_DATA_ROWS) break
  dataRows++

  const row = rowFromLine(header, line)
  const agencyId = row['Agency ID']?.trim()
  if (!agencyId) continue

  const prev = byAgencyId.get(agencyId)
  byAgencyId.set(agencyId, prev ? mergeAgencyRows(prev, row) : row)
}

/** @type {Array<{ agencyId: number; agencyName: string; bookToVouch: number; avgBooking: number; repeatRate: number; cancRate: number; fulfillment: number }>} */
const qualified = []

for (const [agencyId, raw] of byAgencyId) {
  const profile = transformAgencyRow(raw)

  const bookToVouch = profile.bookToVouchDaysHotelAvg
  const avgBooking = profile.avgBookingValue
  const repeatRate = profile.repeatClientRate
  const cancRate = profile.cancellationRate

  if (
    bookToVouch > 0 &&
    avgBooking > 0 &&
    repeatRate > 0 &&
    cancRate > 0 &&
    cancRate < 100
  ) {
    qualified.push({
      agencyId: profile.agencyId,
      agencyName: profile.agencyName,
      bookToVouch,
      avgBooking: Math.round(avgBooking),
      repeatRate: Math.round(repeatRate * 10) / 10,
      cancRate: Math.round(cancRate * 10) / 10,
      fulfillment: Math.round(profile.tripFulfillmentRate * 10) / 10,
    })
  }
}

qualified.sort((a, b) => b.repeatRate - a.repeatRate)

console.log(`Scanned ${dataRows} data rows, ${byAgencyId.size} unique agencies.\n`)
console.log(`Qualified agencies: ${qualified.length}\n`)

/** Prefer balanced demo metrics (not 0% or 100% fulfillment, moderate cancellation). */
const demoFriendly = qualified.filter(
  (c) =>
    c.cancRate >= 8 &&
    c.cancRate <= 45 &&
    c.fulfillment >= 70 &&
    c.fulfillment <= 95,
)

const pool = demoFriendly.length >= 3 ? demoFriendly : qualified
const picks = pool.slice(0, 3)

if (picks.length < 3) {
  console.error('Could not find 3 qualified agencies in the scan window.')
  process.exit(1)
}

console.log('Top 3 picks for mock personas:\n')
for (const [i, p] of picks.entries()) {
  console.log(
    `${i + 1}. ${p.agencyId} — ${p.agencyName}\n` +
      `   book-to-vouch: ${p.bookToVouch}d | avg booking: $${p.avgBooking} | ` +
      `repeat: ${p.repeatRate}% | cancel: ${p.cancRate}% | fulfillment: ${p.fulfillment}%\n`,
  )
}

console.log(JSON.stringify(picks.map((p) => p.agencyId)))
