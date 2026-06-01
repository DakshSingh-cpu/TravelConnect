import Papa from 'papaparse'
import { resolveCityCoords } from '@/lib/cityGeocodes'

// ── Output types ────────────────────────────────────────────────────────────

export type BudgetTier = '$$$ Luxury' | '$$ Premium' | '$ Budget-Friendly'
export type TravelStyleTag = 'Family Specialist' | 'Couples Retreats' | 'Solo Travel Expert'

export interface AgentMapPin {
  city: string
  count: number
  lat: number
  lng: number
}

export interface AgentProfile {
  agencyId: number
  agencyName: string
  city: string
  country: string
  totalVerifiedTrips: number
  yearsAsVerifiedPartner: number
  /** ISO year from Agency Created On, for "Since YYYY" display */
  agencyCreatedYear: number | null
  daysSinceAgencyCreation: number
  topDestinations: string[]
  /** All cities in City Bookings Map (geocoded or not). */
  bookingCities: { city: string; count: number }[]
  mapPins: AgentMapPin[]
  budgetTier: BudgetTier
  travelStyleTag: TravelStyleTag
  isFullServiceConcierge: boolean
  /** Repeat client rate — Rebooking Rate Hotel (0–100) */
  repeatClientRate: number
  rebookingRateHotel: number
  cancellationRate: number
  /** 100 − cancellation rate (0–100) */
  tripFulfillmentRate: number
  bookToVouchDaysHotelAvg: number
  avgBookingValue: number
  /** Distinct metrics for trust UI (not shown elsewhere on profile) */
  numRebookingsHotelTotal: number
  numBookingsVouchHotelTotal: number
  numDistinctCitiesBooked: number
  numDistinctHotelsBooked: number
  numActiveBookers: number
  avgBookingsPerActiveBooker: number
  agentBookingTypeLabel: string | null
  platformSegment: string | null
}

// ── Raw CSV row shape (only the columns we care about) ──────────────────────

export interface RawAgencyRow {
  'Agency ID': string
  'Agency Name': string
  'Agency City Name': string
  'Agency Country Name': string
  'Agency Created On': string
  'Num Bookings Created Hotel Total': string
  'Num Bookings Created Air Total': string
  'Days Since Agency Creation': string
  'Rebooking Rate Hotel': string
  'Cancellation Rate All': string
  'Canc Rate Hotel': string
  'Book To Vouch Days Hotel Avg': string
  'City Bookings Map Hotel Coalesce': string
  'Dest Searches Map Hotel Coalesce'?: string
  'Avg Booking Value': string
  'Sum Tbo Sales Price Vouch Hotel Total': string
  'Sum Tbo Sales Price Hotel Total': string
  'Sum Tbo Sales Price Air Total': string
  'Pax Per Room Hotel Avg': string
  'Multi Product Adoption Count': string
  'Num Rebookings Hotel Total': string
  'Num Bookings Vouch Hotel Total': string
  'Num Distinct Cities Booked': string
  'Num Distinct Hotels Booked': string
  'Num Active Bookers': string
  'Avg Bookings Per Active Booker': string
  'Agent Booking Type Hotel': string
  Segment: string
}

// ── Transformation helpers ──────────────────────────────────────────────────

function safeInt(val: string | undefined): number {
  const n = parseInt(val ?? '', 10)
  return Number.isFinite(n) ? n : 0
}

function safeFloat(val: string | undefined): number {
  const n = parseFloat(val ?? '')
  return Number.isFinite(n) ? n : 0
}

/** CSV stores some rates as 0–1 and others as 0–100; normalize to percentage. */
function normalizePercent(val: number): number {
  if (val <= 0) return 0
  if (val <= 1) return val * 100
  return Math.min(100, val)
}

function parseAgencyCreatedOn(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null
  const d = new Date(raw.trim())
  return Number.isFinite(d.getTime()) ? d : null
}

function resolveDaysSinceCreation(row: RawAgencyRow): number {
  const fromColumn = safeInt(row['Days Since Agency Creation'])
  if (fromColumn > 0) return fromColumn
  const created = parseAgencyCreatedOn(row['Agency Created On'])
  if (!created) return 0
  const ms = Date.now() - created.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function deriveRepeatClientRate(row: RawAgencyRow): number {
  const fromColumn = normalizePercent(safeFloat(row['Rebooking Rate Hotel']))
  if (fromColumn > 0) return fromColumn

  const rebookings = safeInt(row['Num Rebookings Hotel Total'])
  const vouch = safeInt(row['Num Bookings Vouch Hotel Total'])
  const created = safeInt(row['Num Bookings Created Hotel Total'])

  if (rebookings > 0 && vouch > 0) {
    return Math.min(100, (rebookings / vouch) * 100)
  }
  if (rebookings > 0 && created > 0) {
    return Math.min(100, (rebookings / created) * 100)
  }
  return 0
}

/**
 * Metabase stores Avg Booking Value as a per-product map, e.g.
 * `{hotel: 188.03, air: 1579.5, ss: 0.0, ...}` — not always a single number.
 */
export function parseAvgBookingValueComponents(raw?: string): Record<string, number> {
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
    const parsed = JSON.parse(jsonReady) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [key, val] of Object.entries(parsed)) {
      const n = typeof val === 'number' ? val : safeFloat(String(val))
      if (n > 0) out[key.toLowerCase()] = n
    }
    return out
  } catch {
    return {}
  }
}

function deriveAvgBookingValueFromComponents(components: Record<string, number>): number {
  if (components.hotel > 0) return components.hotel
  if (components.air > 0) return components.air
  if (components.total > 0) return components.total

  const vals = Object.values(components).filter((v) => v > 0)
  if (vals.length === 0) return 0
  return vals.reduce((sum, v) => sum + v, 0) / vals.length
}

function mergeAvgBookingValueField(a?: string, b?: string): string {
  const mapA = parseAvgBookingValueComponents(a)
  const mapB = parseAvgBookingValueComponents(b)
  const keys = new Set([...Object.keys(mapA), ...Object.keys(mapB)])
  if (keys.size === 0) return (b?.trim() || a?.trim() || '')

  const merged: Record<string, number> = {}
  for (const key of keys) {
    merged[key] = Math.max(mapA[key] ?? 0, mapB[key] ?? 0)
  }
  return JSON.stringify(merged)
}

function deriveAvgBookingValue(row: RawAgencyRow): number {
  const fromColumn = deriveAvgBookingValueFromComponents(
    parseAvgBookingValueComponents(row['Avg Booking Value']),
  )
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

function deriveBudgetTier(avgBookingValue: number): BudgetTier {
  if (avgBookingValue > 2000) return '$$$ Luxury'
  if (avgBookingValue >= 500) return '$$ Premium'
  return '$ Budget-Friendly'
}

function deriveTravelStyle(paxPerRoom: number): TravelStyleTag {
  if (paxPerRoom >= 3) return 'Family Specialist'
  if (paxPerRoom >= 1.5) return 'Couples Retreats'
  return 'Solo Travel Expert'
}

/**
 * Parses the double-quoted JSON city → booking count map from the CSV.
 */
export function parseCityBookingsMap(raw: string | undefined): { city: string; count: number }[] {
  if (!raw || raw.trim() === '') return []

  try {
    const parsed: Record<string, number> = JSON.parse(raw)
    return Object.entries(parsed)
      .map(([city, count]) => ({ city: city.trim(), count: Number(count) || 0 }))
      .filter((e) => e.city && e.count > 0)
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

function cityCountFromMapRaw(raw?: string): number {
  return parseCityBookingsMap(raw).length
}

/** Union duplicate CSV rows — sums counts per city (matches Metabase-style coalesce). */
export function mergeCityMapJson(a?: string, b?: string): string {
  const totals = new Map<string, number>()
  for (const { city, count } of parseCityBookingsMap(a)) {
    totals.set(city, (totals.get(city) ?? 0) + count)
  }
  for (const { city, count } of parseCityBookingsMap(b)) {
    totals.set(city, (totals.get(city) ?? 0) + count)
  }
  if (totals.size === 0) return ''
  const merged = Object.fromEntries(
    [...totals.entries()].sort((a, b) => b[1] - a[1]),
  )
  return JSON.stringify(merged)
}

/** Merge duplicate CSV rows for the same agency before transforming. */
export function mergeAgencyRows(existing: RawAgencyRow, incoming: RawAgencyRow): RawAgencyRow {
  const merged: RawAgencyRow = { ...existing, ...incoming }

  merged['City Bookings Map Hotel Coalesce'] = mergeCityMapJson(
    existing['City Bookings Map Hotel Coalesce'],
    incoming['City Bookings Map Hotel Coalesce'],
  )

  const numericMax = (a?: string, b?: string) =>
    String(Math.max(safeInt(a), safeInt(b)))
  const numericMaxFloat = (a?: string, b?: string) =>
    String(Math.max(safeFloat(a), safeFloat(b)))

  merged['Num Bookings Created Hotel Total'] = numericMax(
    existing['Num Bookings Created Hotel Total'],
    incoming['Num Bookings Created Hotel Total'],
  )
  merged['Num Bookings Created Air Total'] = numericMax(
    existing['Num Bookings Created Air Total'],
    incoming['Num Bookings Created Air Total'],
  )
  merged['Num Bookings Vouch Hotel Total'] = numericMax(
    existing['Num Bookings Vouch Hotel Total'],
    incoming['Num Bookings Vouch Hotel Total'],
  )
  merged['Num Distinct Cities Booked'] = numericMax(
    existing['Num Distinct Cities Booked'],
    incoming['Num Distinct Cities Booked'],
  )
  merged['Sum Tbo Sales Price Hotel Total'] = numericMaxFloat(
    existing['Sum Tbo Sales Price Hotel Total'],
    incoming['Sum Tbo Sales Price Hotel Total'],
  )
  merged['Sum Tbo Sales Price Vouch Hotel Total'] = numericMaxFloat(
    existing['Sum Tbo Sales Price Vouch Hotel Total'],
    incoming['Sum Tbo Sales Price Vouch Hotel Total'],
  )
  merged['Sum Tbo Sales Price Air Total'] = numericMaxFloat(
    existing['Sum Tbo Sales Price Air Total'],
    incoming['Sum Tbo Sales Price Air Total'],
  )
  merged['Book To Vouch Days Hotel Avg'] = numericMaxFloat(
    existing['Book To Vouch Days Hotel Avg'],
    incoming['Book To Vouch Days Hotel Avg'],
  )
  merged['Avg Booking Value'] = mergeAvgBookingValueField(
    existing['Avg Booking Value'],
    incoming['Avg Booking Value'],
  )

  const cityCount = cityCountFromMapRaw(merged['City Bookings Map Hotel Coalesce'])
  if (cityCount > safeInt(merged['Num Distinct Cities Booked'])) {
    merged['Num Distinct Cities Booked'] = String(cityCount)
  }

  return merged
}

/** Top N city names for profile tags. */
function extractTopDestinations(raw: string | undefined): string[] {
  return parseCityBookingsMap(raw)
    .slice(0, 3)
    .map((e) => e.city)
}

/**
 * Many agencies have duplicate CSV rows; the first row often leaves
 * `Num Distinct Cities Booked` blank while `City Bookings Map Hotel Coalesce` is filled.
 */
function deriveDistinctCitiesBooked(row: RawAgencyRow): number {
  const fromColumn = safeInt(row['Num Distinct Cities Booked'])
  if (fromColumn > 0) return fromColumn
  return parseCityBookingsMap(row['City Bookings Map Hotel Coalesce']).length
}

/** Map pins for Leaflet — only cities with known coordinates. */
function buildMapPins(raw: string | undefined): AgentMapPin[] {
  const pins: AgentMapPin[] = []

  for (const { city, count } of parseCityBookingsMap(raw)) {
    const coords = resolveCityCoords(city)
    if (!coords) continue
    pins.push({
      city,
      count,
      lat: coords[0],
      lng: coords[1],
    })
  }

  return pins
}

function extractCancellationRate(row: RawAgencyRow): number {
  const all = safeFloat(row['Cancellation Rate All'])
  if (all > 0) return all
  return safeFloat(row['Canc Rate Hotel'])
}

const BOOKING_TYPE_LABELS: Record<string, string> = {
  friends_family: 'Family & leisure specialist',
  corporate: 'Corporate travel specialist',
  large_group: 'Large group itineraries',
  small_group: 'Small group itineraries',
  indeterminate: 'Mixed travel portfolios',
  not_qualified: 'General travel partner',
}

function formatAgentBookingType(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  return BOOKING_TYPE_LABELS[key] ?? raw.trim().replace(/_/g, ' ')
}

function formatPlatformSegment(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim().toLowerCase()
  if (s === 'managed') return 'TravelConnect-managed partner'
  if (s === 'large') return 'High-volume platform partner'
  if (s === 'value') return 'Value segment partner'
  return null
}

// ── Core processor ──────────────────────────────────────────────────────────

export function transformAgencyRow(row: RawAgencyRow): AgentProfile {
  const hotelBookings = safeInt(row['Num Bookings Created Hotel Total'])
  const airBookings = safeInt(row['Num Bookings Created Air Total'])
  const daysSinceCreation = resolveDaysSinceCreation(row)
  const createdOn = parseAgencyCreatedOn(row['Agency Created On'])
  const avgBookingValue = deriveAvgBookingValue(row)
  const paxPerRoom = safeFloat(row['Pax Per Room Hotel Avg'])
  const multiProduct = safeInt(row['Multi Product Adoption Count'])
  const repeatClientRate = deriveRepeatClientRate(row)
  const cancellationRate = normalizePercent(extractCancellationRate(row))
  const vouchHotel = safeInt(row['Num Bookings Vouch Hotel Total'])
  const hasBookingActivity = hotelBookings > 0 || vouchHotel > 0
  const tripFulfillmentRate = hasBookingActivity
    ? Math.max(0, Math.min(100, 100 - cancellationRate))
    : 0

  const cityMapRaw = row['City Bookings Map Hotel Coalesce']

  return {
    agencyId: safeInt(row['Agency ID']),
    agencyName: (row['Agency Name'] ?? '').trim(),
    city: (row['Agency City Name'] ?? '').trim(),
    country: (row['Agency Country Name'] ?? '').trim(),
    totalVerifiedTrips: hotelBookings + airBookings,
    yearsAsVerifiedPartner: Math.floor(daysSinceCreation / 365),
    agencyCreatedYear: createdOn ? createdOn.getFullYear() : null,
    daysSinceAgencyCreation: daysSinceCreation,
    topDestinations: extractTopDestinations(cityMapRaw),
    bookingCities: parseCityBookingsMap(cityMapRaw),
    mapPins: buildMapPins(cityMapRaw),
    budgetTier: deriveBudgetTier(avgBookingValue),
    travelStyleTag: deriveTravelStyle(paxPerRoom),
    isFullServiceConcierge: multiProduct > 1,
    repeatClientRate,
    rebookingRateHotel: repeatClientRate,
    cancellationRate,
    tripFulfillmentRate,
    bookToVouchDaysHotelAvg: safeFloat(row['Book To Vouch Days Hotel Avg']),
    avgBookingValue,
    numRebookingsHotelTotal: safeInt(row['Num Rebookings Hotel Total']),
    numBookingsVouchHotelTotal: safeInt(row['Num Bookings Vouch Hotel Total']),
    numDistinctCitiesBooked: deriveDistinctCitiesBooked(row),
    numDistinctHotelsBooked: safeInt(row['Num Distinct Hotels Booked']),
    numActiveBookers: safeInt(row['Num Active Bookers']),
    avgBookingsPerActiveBooker: safeFloat(row['Avg Bookings Per Active Booker']),
    agentBookingTypeLabel: formatAgentBookingType(row['Agent Booking Type Hotel']),
    platformSegment: formatPlatformSegment(row.Segment),
  }
}

/**
 * Given a raw CSV string and an array of exactly 3 Agency IDs,
 * parses the CSV, finds matching rows, and returns sanitized AgentProfile objects.
 */
export function processAgencyData(
  csvString: string,
  agencyIds: number[],
): AgentProfile[] {
  const { data } = Papa.parse<RawAgencyRow>(csvString, {
    header: true,
    skipEmptyLines: true,
  })

  const idSet = new Set(agencyIds.map(String))

  const rawById = new Map<string, RawAgencyRow>()
  for (const row of data) {
    if (!idSet.has(row['Agency ID'])) continue
    const id = row['Agency ID']
    const prev = rawById.get(id)
    rawById.set(id, prev ? mergeAgencyRows(prev, row) : row)
  }
  return [...rawById.values()].map(transformAgencyRow)
}

/**
 * Convenience wrapper: accepts pre-parsed row objects instead of raw CSV text.
 * Useful when the CSV is already loaded on the server side.
 */
export function processAgencyRows(
  rows: RawAgencyRow[],
  agencyIds: number[],
): AgentProfile[] {
  const idSet = new Set(agencyIds.map(String))
  const rawById = new Map<string, RawAgencyRow>()
  for (const row of rows) {
    if (!idSet.has(row['Agency ID'])) continue
    const id = row['Agency ID']
    const prev = rawById.get(id)
    rawById.set(id, prev ? mergeAgencyRows(prev, row) : row)
  }
  return [...rawById.values()].map(transformAgencyRow)
}
