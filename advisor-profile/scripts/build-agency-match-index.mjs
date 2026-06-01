/**
 * Offline indexer: scans the TBO CSV once and builds data/match.db (SQLite).
 * Creates agencies, agency_cities, and agency_countries tables for fast
 * matchmaking queries at runtime without touching the 350MB source CSV.
 *
 * Usage: node scripts/build-agency-match-index.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Papa from 'papaparse'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const csvPath = path.join(root, '..', 'query_result_2026-05-22T05_23_26.420933Z.csv')
const dbPath = path.join(root, 'data', 'match.db')

// ── Utility helpers (mirrors lib/agencyDataProcessor.ts) ────────────────────

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

function parseCityBookingsMap(raw) {
  if (!raw || raw.trim() === '') return []
  try {
    const parsed = JSON.parse(raw)
    return Object.entries(parsed)
      .map(([city, count]) => ({ city: city.trim(), count: Number(count) || 0 }))
      .filter((e) => e.city && e.count > 0)
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

function mergeCityMapJson(a, b) {
  const totals = new Map()
  for (const { city, count } of parseCityBookingsMap(a))
    totals.set(city, (totals.get(city) ?? 0) + count)
  for (const { city, count } of parseCityBookingsMap(b))
    totals.set(city, (totals.get(city) ?? 0) + count)
  if (totals.size === 0) return ''
  const merged = Object.fromEntries([...totals.entries()].sort((a, b) => b[1] - a[1]))
  return JSON.stringify(merged)
}

function mergeAvgBookingValueField(a, b) {
  const parseComponents = (raw) => {
    if (!raw?.trim()) return {}
    const trimmed = raw.trim()
    if (!trimmed.startsWith('{')) {
      const n = safeFloat(trimmed)
      return n > 0 ? { hotel: n } : {}
    }
    try {
      const jsonReady = /[{,]\s*[a-zA-Z_]/.test(trimmed)
        ? trimmed.replace(/([{,]\s*)([a-zA-Z_][\w]*)\s*:/g, '$1"$2":')
        : trimmed
      const parsed = JSON.parse(jsonReady)
      const out = {}
      for (const [key, val] of Object.entries(parsed)) {
        const n = typeof val === 'number' ? val : safeFloat(String(val))
        if (n > 0) out[key.toLowerCase()] = n
      }
      return out
    } catch { return {} }
  }
  const mapA = parseComponents(a)
  const mapB = parseComponents(b)
  const keys = new Set([...Object.keys(mapA), ...Object.keys(mapB)])
  if (keys.size === 0) return (b?.trim() || a?.trim() || '')
  const merged = {}
  for (const key of keys) merged[key] = Math.max(mapA[key] ?? 0, mapB[key] ?? 0)
  return JSON.stringify(merged)
}

function mergeAgencyRows(existing, incoming) {
  const merged = { ...existing, ...incoming }
  merged['City Bookings Map Hotel Coalesce'] = mergeCityMapJson(
    existing['City Bookings Map Hotel Coalesce'],
    incoming['City Bookings Map Hotel Coalesce'],
  )
  const numericMax = (a, b) => String(Math.max(safeInt(a), safeInt(b)))
  const numericMaxFloat = (a, b) => String(Math.max(safeFloat(a), safeFloat(b)))

  merged['Num Bookings Created Hotel Total'] = numericMax(existing['Num Bookings Created Hotel Total'], incoming['Num Bookings Created Hotel Total'])
  merged['Num Bookings Created Air Total'] = numericMax(existing['Num Bookings Created Air Total'], incoming['Num Bookings Created Air Total'])
  merged['Num Bookings Vouch Hotel Total'] = numericMax(existing['Num Bookings Vouch Hotel Total'], incoming['Num Bookings Vouch Hotel Total'])
  merged['Num Distinct Cities Booked'] = numericMax(existing['Num Distinct Cities Booked'], incoming['Num Distinct Cities Booked'])
  merged['Sum Tbo Sales Price Hotel Total'] = numericMaxFloat(existing['Sum Tbo Sales Price Hotel Total'], incoming['Sum Tbo Sales Price Hotel Total'])
  merged['Sum Tbo Sales Price Vouch Hotel Total'] = numericMaxFloat(existing['Sum Tbo Sales Price Vouch Hotel Total'], incoming['Sum Tbo Sales Price Vouch Hotel Total'])
  merged['Sum Tbo Sales Price Air Total'] = numericMaxFloat(existing['Sum Tbo Sales Price Air Total'], incoming['Sum Tbo Sales Price Air Total'])
  merged['Book To Vouch Days Hotel Avg'] = numericMaxFloat(existing['Book To Vouch Days Hotel Avg'], incoming['Book To Vouch Days Hotel Avg'])
  merged['Avg Booking Value'] = mergeAvgBookingValueField(existing['Avg Booking Value'], incoming['Avg Booking Value'])
  merged['Num Rebookings Hotel Total'] = numericMax(existing['Num Rebookings Hotel Total'], incoming['Num Rebookings Hotel Total'])
  merged['Num Distinct Hotels Booked'] = numericMax(existing['Num Distinct Hotels Booked'], incoming['Num Distinct Hotels Booked'])
  merged['Num Active Bookers'] = numericMax(existing['Num Active Bookers'], incoming['Num Active Bookers'])
  merged['Avg Bookings Per Active Booker'] = numericMaxFloat(existing['Avg Bookings Per Active Booker'], incoming['Avg Bookings Per Active Booker'])

  const cityCount = parseCityBookingsMap(merged['City Bookings Map Hotel Coalesce']).length
  if (cityCount > safeInt(merged['Num Distinct Cities Booked'])) {
    merged['Num Distinct Cities Booked'] = String(cityCount)
  }
  return merged
}

// ── Transform row → AgentProfile (simplified for indexer) ───────────────────

function deriveAvgBookingValue(row) {
  const parseComponents = (raw) => {
    if (!raw?.trim()) return {}
    const trimmed = raw.trim()
    if (!trimmed.startsWith('{')) {
      const n = safeFloat(trimmed)
      return n > 0 ? { hotel: n } : {}
    }
    try {
      const jsonReady = /[{,]\s*[a-zA-Z_]/.test(trimmed)
        ? trimmed.replace(/([{,]\s*)([a-zA-Z_][\w]*)\s*:/g, '$1"$2":')
        : trimmed
      const parsed = JSON.parse(jsonReady)
      const out = {}
      for (const [key, val] of Object.entries(parsed)) {
        const n = typeof val === 'number' ? val : safeFloat(String(val))
        if (n > 0) out[key.toLowerCase()] = n
      }
      return out
    } catch { return {} }
  }
  const deriveFromComponents = (components) => {
    if (components.hotel > 0) return components.hotel
    if (components.air > 0) return components.air
    if (components.total > 0) return components.total
    const vals = Object.values(components).filter((v) => v > 0)
    if (vals.length === 0) return 0
    return vals.reduce((sum, v) => sum + v, 0) / vals.length
  }
  const fromColumn = deriveFromComponents(parseComponents(row['Avg Booking Value']))
  if (fromColumn > 0) return fromColumn
  const vouchSum = safeFloat(row['Sum Tbo Sales Price Vouch Hotel Total'])
  const vouchCount = safeInt(row['Num Bookings Vouch Hotel Total'])
  if (vouchSum > 0 && vouchCount > 0) return vouchSum / vouchCount
  const hotelSum = safeFloat(row['Sum Tbo Sales Price Hotel Total'])
  const hotelCount = safeInt(row['Num Bookings Created Hotel Total'])
  if (hotelSum > 0 && hotelCount > 0) return hotelSum / hotelCount
  const airSum = safeFloat(row['Sum Tbo Sales Price Air Total'])
  const airCount = safeInt(row['Num Bookings Created Air Total'])
  if (airSum > 0 && airCount > 0) return airSum / airCount
  return 0
}

function deriveBudgetTier(avgBookingValue) {
  if (avgBookingValue > 2000) return '$$$ Luxury'
  if (avgBookingValue >= 500) return '$$ Premium'
  return '$ Budget-Friendly'
}

function deriveTravelStyle(paxPerRoom) {
  if (paxPerRoom >= 3) return 'Family Specialist'
  if (paxPerRoom >= 1.5) return 'Couples Retreats'
  return 'Solo Travel Expert'
}

function deriveRepeatClientRate(row) {
  const fromColumn = normalizePercent(safeFloat(row['Rebooking Rate Hotel']))
  if (fromColumn > 0) return fromColumn
  const rebookings = safeInt(row['Num Rebookings Hotel Total'])
  const vouch = safeInt(row['Num Bookings Vouch Hotel Total'])
  const created = safeInt(row['Num Bookings Created Hotel Total'])
  if (rebookings > 0 && vouch > 0) return Math.min(100, (rebookings / vouch) * 100)
  if (rebookings > 0 && created > 0) return Math.min(100, (rebookings / created) * 100)
  return 0
}

function transformAgencyRow(row) {
  const hotelBookings = safeInt(row['Num Bookings Created Hotel Total'])
  const airBookings = safeInt(row['Num Bookings Created Air Total'])
  const avgBookingValue = deriveAvgBookingValue(row)
  const paxPerRoom = safeFloat(row['Pax Per Room Hotel Avg'])
  const multiProduct = safeInt(row['Multi Product Adoption Count'])
  const repeatClientRate = deriveRepeatClientRate(row)
  const cancRate = normalizePercent(
    safeFloat(row['Cancellation Rate All']) || safeFloat(row['Canc Rate Hotel'])
  )
  const vouchHotel = safeInt(row['Num Bookings Vouch Hotel Total'])
  const hasBookingActivity = hotelBookings > 0 || vouchHotel > 0
  const tripFulfillmentRate = hasBookingActivity ? Math.max(0, Math.min(100, 100 - cancRate)) : 0
  const cityMapRaw = row['City Bookings Map Hotel Coalesce']
  const daysSince = safeInt(row['Days Since Agency Creation'])

  return {
    agencyId: safeInt(row['Agency ID']),
    agencyName: (row['Agency Name'] ?? '').trim(),
    city: (row['Agency City Name'] ?? '').trim(),
    country: (row['Agency Country Name'] ?? '').trim(),
    totalVerifiedTrips: hotelBookings + airBookings,
    yearsAsVerifiedPartner: Math.floor(daysSince / 365),
    agencyCreatedYear: null,
    daysSinceAgencyCreation: daysSince,
    topDestinations: parseCityBookingsMap(cityMapRaw).slice(0, 3).map((e) => e.city),
    bookingCities: parseCityBookingsMap(cityMapRaw),
    mapPins: [],
    budgetTier: deriveBudgetTier(avgBookingValue),
    travelStyleTag: deriveTravelStyle(paxPerRoom),
    isFullServiceConcierge: multiProduct > 1,
    repeatClientRate,
    rebookingRateHotel: repeatClientRate,
    cancellationRate: cancRate,
    tripFulfillmentRate,
    bookToVouchDaysHotelAvg: safeFloat(row['Book To Vouch Days Hotel Avg']),
    avgBookingValue,
    numRebookingsHotelTotal: safeInt(row['Num Rebookings Hotel Total']),
    numBookingsVouchHotelTotal: safeInt(row['Num Bookings Vouch Hotel Total']),
    numDistinctCitiesBooked: Math.max(safeInt(row['Num Distinct Cities Booked']), parseCityBookingsMap(cityMapRaw).length),
    numDistinctHotelsBooked: safeInt(row['Num Distinct Hotels Booked']),
    numActiveBookers: safeInt(row['Num Active Bookers']),
    avgBookingsPerActiveBooker: safeFloat(row['Avg Bookings Per Active Booker']),
    agentBookingTypeLabel: row['Agent Booking Type Hotel']?.trim() || null,
    platformSegment: row.Segment?.trim() || null,
  }
}

// ── City → Country mapping (common travel destinations) ─────────────────────

const CITY_COUNTRY_MAP = {
  'dubai': 'uae', 'abu dhabi': 'uae', 'sharjah': 'uae',
  'bangkok': 'thailand', 'pattaya': 'thailand', 'phuket': 'thailand', 'chiang mai': 'thailand', 'krabi': 'thailand',
  'singapore': 'singapore',
  'kuala lumpur': 'malaysia', 'langkawi': 'malaysia', 'penang': 'malaysia', 'ampang': 'malaysia',
  'bali': 'indonesia', 'jakarta': 'indonesia',
  'paris': 'france', 'lyon': 'france', 'nice': 'france',
  'london': 'uk', 'manchester': 'uk', 'edinburgh': 'uk',
  'rome': 'italy', 'milan': 'italy', 'venice': 'italy', 'florence': 'italy',
  'barcelona': 'spain', 'madrid': 'spain',
  'tokyo': 'japan', 'osaka': 'japan', 'kyoto': 'japan',
  'new york': 'usa', 'los angeles': 'usa', 'miami': 'usa', 'miami beach': 'usa', 'las vegas': 'usa', 'rochester': 'usa', 'san francisco': 'usa',
  'sydney': 'australia', 'melbourne': 'australia',
  'toronto': 'canada', 'vancouver': 'canada',
  'istanbul': 'turkey', 'antalya': 'turkey', 'belek': 'turkey',
  'mumbai': 'india', 'delhi': 'india', 'goa': 'india', 'jaipur': 'india', 'ghaziabad': 'india',
  'colombo': 'sri lanka',
  'male': 'maldives',
  'hong kong': 'hong kong',
  'manila': 'philippines', 'cebu': 'philippines', 'boracay': 'philippines', 'davao': 'philippines', 'makati': 'philippines',
  'amsterdam': 'netherlands', 'rotterdam': 'netherlands',
  'brussels': 'belgium', 'bruges': 'belgium',
  'berlin': 'germany', 'munich': 'germany', 'frankfurt': 'germany', 'dresden': 'germany', 'cologne': 'germany', 'koeln': 'germany',
  'zurich': 'switzerland', 'geneva': 'switzerland',
  'vienna': 'austria', 'murau': 'austria',
  'prague': 'czech republic',
  'budapest': 'hungary',
  'warsaw': 'poland',
  'copenhagen': 'denmark',
  'stockholm': 'sweden',
  'helsinki': 'finland', 'rovaniemi': 'finland',
  'lisbon': 'portugal',
  'cairo': 'egypt',
  'doha': 'qatar',
  'muscat': 'oman',
  'nairobi': 'kenya',
  'cape town': 'south africa', 'johannesburg': 'south africa',
  'rio de janeiro': 'brazil', 'sao paulo': 'brazil', 'fortaleza': 'brazil', 'recife': 'brazil',
  'dhaka': 'bangladesh', 'chittagong': 'bangladesh',
  'kathmandu': 'nepal',
  'hanoi': 'vietnam', 'ho chi minh': 'vietnam',
  'seoul': 'south korea',
  'beijing': 'china', 'shanghai': 'china',
  'taipei': 'taiwan',
  'moscow': 'russia',
  'athens': 'greece', 'santorini': 'greece',
  'dublin': 'ireland',
}

function inferCountry(cityName) {
  const lower = cityName.toLowerCase().trim()
  if (CITY_COUNTRY_MAP[lower]) return CITY_COUNTRY_MAP[lower]
  for (const [key, country] of Object.entries(CITY_COUNTRY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return country
  }
  return 'unknown'
}

// ── Main build pipeline ─────────────────────────────────────────────────────

console.log('Building agency match index...')
console.log(`CSV: ${csvPath}`)
console.log(`DB:  ${dbPath}`)

if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found at', csvPath)
  process.exit(1)
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true })
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)

const rawById = new Map()
const start = Date.now()
let rowCount = 0

Papa.parse(fs.createReadStream(csvPath), {
  header: true,
  skipEmptyLines: true,
  step(results) {
    const row = results.data
    const id = row['Agency ID']
    if (!id) return
    rowCount++
    const prev = rawById.get(id)
    rawById.set(id, prev ? mergeAgencyRows(prev, row) : row)
  },
  complete() {
    const scanSec = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`Scanned ${rowCount} rows → ${rawById.size} unique agencies in ${scanSec}s`)

    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')

    db.exec(`
      CREATE TABLE agencies (
        id INTEGER PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE agency_cities (
        agency_id INTEGER NOT NULL,
        city TEXT NOT NULL,
        country TEXT NOT NULL,
        booking_count INTEGER NOT NULL
      );
      CREATE TABLE agency_countries (
        agency_id INTEGER NOT NULL,
        country TEXT NOT NULL,
        booking_count INTEGER NOT NULL
      );
      CREATE INDEX idx_cities_city ON agency_cities(city);
      CREATE INDEX idx_cities_country ON agency_cities(country);
      CREATE INDEX idx_countries_country ON agency_countries(country);
      CREATE INDEX idx_cities_agency ON agency_cities(agency_id);
      CREATE INDEX idx_countries_agency ON agency_countries(agency_id);
    `)

    const insertAgency = db.prepare('INSERT INTO agencies (id, data) VALUES (?, ?)')
    const insertCity = db.prepare('INSERT INTO agency_cities (agency_id, city, country, booking_count) VALUES (?, ?, ?, ?)')
    const insertCountry = db.prepare('INSERT INTO agency_countries (agency_id, country, booking_count) VALUES (?, ?, ?)')

    let accepted = 0
    let filtered = 0

    const insertAll = db.transaction(() => {
      for (const [, rawRow] of rawById) {
        const profile = transformAgencyRow(rawRow)

        if (profile.totalVerifiedTrips < 3 || profile.bookingCities.length === 0) {
          filtered++
          continue
        }

        insertAgency.run(profile.agencyId, JSON.stringify(profile))

        const countryTotals = new Map()
        for (const { city, count } of profile.bookingCities) {
          const country = inferCountry(city)
          insertCity.run(profile.agencyId, city.toLowerCase(), country, count)
          countryTotals.set(country, (countryTotals.get(country) ?? 0) + count)
        }

        for (const [country, total] of countryTotals) {
          insertCountry.run(profile.agencyId, country, total)
        }

        accepted++
      }
    })

    insertAll()
    db.close()

    const totalSec = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`\nDone in ${totalSec}s`)
    console.log(`  Accepted: ${accepted} agencies`)
    console.log(`  Filtered: ${filtered} agencies (< 3 trips or no cities)`)
    console.log(`  Output:   ${dbPath}`)
  },
  error(err) {
    console.error('CSV parse error:', err)
    process.exit(1)
  },
})
