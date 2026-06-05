/**
 * Country → primary language mapping + haversine distance for proximity scoring.
 * Used by the local-advisor matching pipeline.
 */

const COUNTRY_LANGUAGES: Record<string, string[]> = {
  IN: ['hi', 'en'],
  US: ['en'],
  GB: ['en'],
  CA: ['en', 'fr'],
  AU: ['en'],
  NZ: ['en'],
  IE: ['en'],
  ZA: ['en'],
  SG: ['en', 'zh'],
  PH: ['en', 'tl'],
  MY: ['ms', 'en'],
  AE: ['ar', 'en'],
  SA: ['ar'],
  QA: ['ar', 'en'],
  OM: ['ar'],
  KW: ['ar'],
  BH: ['ar'],
  EG: ['ar'],
  JO: ['ar'],
  LB: ['ar', 'fr'],
  FR: ['fr'],
  BE: ['fr', 'nl', 'de'],
  CH: ['de', 'fr', 'it'],
  DE: ['de'],
  AT: ['de'],
  NL: ['nl'],
  IT: ['it'],
  ES: ['es'],
  PT: ['pt'],
  BR: ['pt'],
  MX: ['es'],
  JP: ['ja'],
  KR: ['ko'],
  CN: ['zh'],
  TW: ['zh'],
  HK: ['zh', 'en'],
  TH: ['th'],
  VN: ['vi'],
  ID: ['id'],
  BD: ['bn'],
  LK: ['si', 'ta', 'en'],
  NP: ['ne'],
  PK: ['ur', 'en'],
  TR: ['tr'],
  RU: ['ru'],
  PL: ['pl'],
  CZ: ['cs'],
  HU: ['hu'],
  GR: ['el'],
  SE: ['sv'],
  DK: ['da'],
  FI: ['fi'],
  NO: ['no'],
  KE: ['sw', 'en'],
  NG: ['en'],
  GH: ['en'],
  MA: ['ar', 'fr'],
  TN: ['ar', 'fr'],
  DZ: ['ar', 'fr'],
  GE: ['ka'],
  AZ: ['az'],
  KZ: ['kk', 'ru'],
  UZ: ['uz', 'ru'],
  MV: ['dv', 'en'],
}

/**
 * Normalised country name → ISO 3166-1 alpha-2.
 * Covers the countries that appear in the C360 agency dataset.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  india: 'IN',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'UK',
  uk: 'GB',
  gb: 'GB',
  canada: 'CA',
  australia: 'AU',
  'new zealand': 'NZ',
  ireland: 'IE',
  'south africa': 'ZA',
  singapore: 'SG',
  philippines: 'PH',
  malaysia: 'MY',
  'united arab emirates': 'AE',
  uae: 'AE',
  'saudi arabia': 'SA',
  qatar: 'QA',
  oman: 'OM',
  kuwait: 'KW',
  bahrain: 'BH',
  egypt: 'EG',
  jordan: 'JO',
  lebanon: 'LB',
  france: 'FR',
  belgium: 'BE',
  switzerland: 'CH',
  germany: 'DE',
  austria: 'AT',
  netherlands: 'NL',
  italy: 'IT',
  spain: 'ES',
  portugal: 'PT',
  brazil: 'BR',
  mexico: 'MX',
  japan: 'JP',
  'south korea': 'KR',
  korea: 'KR',
  china: 'CN',
  taiwan: 'TW',
  'hong kong': 'HK',
  thailand: 'TH',
  vietnam: 'VN',
  indonesia: 'ID',
  bangladesh: 'BD',
  'sri lanka': 'LK',
  nepal: 'NP',
  pakistan: 'PK',
  turkey: 'TR',
  russia: 'RU',
  poland: 'PL',
  'czech republic': 'CZ',
  czechia: 'CZ',
  hungary: 'HU',
  greece: 'GR',
  sweden: 'SE',
  denmark: 'DK',
  finland: 'FI',
  norway: 'NO',
  kenya: 'KE',
  nigeria: 'NG',
  ghana: 'GH',
  morocco: 'MA',
  tunisia: 'TN',
  algeria: 'DZ',
  georgia: 'GE',
  azerbaijan: 'AZ',
  kazakhstan: 'KZ',
  uzbekistan: 'UZ',
  maldives: 'MV',
}

export function countryNameToCode(name: string): string | null {
  return COUNTRY_NAME_TO_CODE[name.toLowerCase().trim()] ?? null
}

export function languagesForCountryCode(code: string): string[] {
  return COUNTRY_LANGUAGES[code.toUpperCase()] ?? []
}

export function languagesForCountryName(name: string): string[] {
  const code = countryNameToCode(name)
  return code ? languagesForCountryCode(code) : []
}

/**
 * Score 0–1 indicating how much the user's language overlaps with an agency's
 * country language pool.
 */
export function computeLanguageScore(userLanguage: string, agencyCountry: string): number {
  const userLang = userLanguage.toLowerCase().split('-')[0]
  const agencyLangs = languagesForCountryName(agencyCountry)
  if (agencyLangs.length === 0) return 0.3

  if (agencyLangs.includes(userLang)) return 1.0
  if (agencyLangs.includes('en') && userLang === 'en') return 1.0
  if (agencyLangs.includes('en')) return 0.6
  return 0.1
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Exponential decay: nearby agencies score ~1.0, decays with distance.
 * ~500 km → 0.37, ~1000 km → 0.14, ~2000 km → 0.02
 */
export function computeProximityScore(distanceKm: number): number {
  return Math.exp(-distanceKm / 500)
}
