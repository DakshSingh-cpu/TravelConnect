/**
 * Scans the TBO CSV once and writes data/agency-rankings.json (sorted agency IDs).
 * After this, /api/match-advisors only looks up 3 rows — typically under a second.
 *
 * Usage: npm run build:rankings
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Papa from 'papaparse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const csvPath = path.join(root, '..', 'query_result_2026-05-22T05_23_26.420933Z.csv')
const outPath = path.join(root, 'data', 'agency-rankings.json')

function safeInt(val) {
  const n = parseInt(val ?? '', 10)
  return Number.isFinite(n) ? n : 0
}

function safeFloat(val) {
  const n = parseFloat(val ?? '')
  return Number.isFinite(n) ? n : 0
}

function normalizePercent(val) {
  if (val <= 0) return 0
  if (val <= 1) return val * 100
  return Math.min(100, val)
}

function scoreRow(row) {
  const hotel = safeInt(row['Num Bookings Created Hotel Total'])
  const air = safeInt(row['Num Bookings Created Air Total'])
  const vouch = safeInt(row['Num Bookings Vouch Hotel Total'])
  if (hotel + air <= 0 && vouch <= 0) return null

  const cancel = normalizePercent(
    safeFloat(row['Cancellation Rate All']) || safeFloat(row['Canc Rate Hotel']),
  )
  const fulfillment = Math.max(0, 100 - cancel)
  if (fulfillment <= 0 && cancel <= 0) return null

  return { fulfillment, cancel }
}

const byId = new Map()
const start = Date.now()

console.log('Scanning CSV (expect ~30–60 seconds)…')

Papa.parse(fs.createReadStream(csvPath), {
  header: true,
  skipEmptyLines: true,
  step(results) {
    const row = results.data
    const id = row['Agency ID']
    if (!id) return

    const scored = scoreRow(row)
    if (!scored) return

    const prev = byId.get(id)
    if (
      !prev ||
      scored.fulfillment > prev.fulfillment ||
      (scored.fulfillment === prev.fulfillment && scored.cancel < prev.cancel)
    ) {
      byId.set(id, scored)
    }
  },
  complete() {
    const rankedIds = [...byId.entries()]
      .sort(([, a], [, b]) => b.fulfillment - a.fulfillment || a.cancel - b.cancel)
      .map(([id]) => safeInt(id))
      .filter((id) => id > 0)

    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, JSON.stringify(rankedIds))

    const sec = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`Wrote ${rankedIds.length} ranked agency IDs to data/agency-rankings.json in ${sec}s`)
    console.log('Top 3 IDs:', rankedIds.slice(0, 3).join(', '))
  },
  error(err) {
    console.error(err)
    process.exit(1)
  },
})
