/** Shared guardrail thresholds — keep in sync with StepBudget MIN_L / MAX_L. */
export const MIN_BUDGET_LAKH = 5
export const MAX_BUDGET_LAKH = 100

export const MIN_DESTINATION_LENGTH = 3

/** Lowercase strings — compared after trim + toLowerCase on destination. */
export const BLOCKED_DESTINATIONS = [
  'surprise me',
  'anywhere',
  'everywhere',
  'somewhere',
  'abroad',
  'international',
] as const

export const BLOCKED_TIMINGS = ['Just dreaming'] as const

/** Full pool for "Surprise me" — randomly pick one so the user gets a genuine surprise. */
export const SURPRISE_ME_POOL = [
  'Italy',
  'Switzerland',
  'Greece',
  'Turkey',
  'Thailand',
  'Vietnam',
  'Bali',
  'South Korea',
  'New Zealand',
  'Morocco',
  'Portugal',
  'Croatia',
  'Peru',
  'Iceland',
  'Sri Lanka',
  'Kenya Safari',
] as const

export const INTAKE_BLOCKED_MESSAGE_DESTINATION =
  'Please name a specific destination — a country, city, or region we can match to a specialist.'

export const INTAKE_BLOCKED_MESSAGE_BUDGET =
  'Please provide a valid trip budget between ₹5L and ₹100L.'

export const INTAKE_BLOCKED_MESSAGE_TRAVEL_STYLE = 'Please select a travel style to continue.'

export const INTAKE_BLOCKED_MESSAGE_TIMING =
  'Our advisors work best with travellers who have a rough timeframe in mind. Pick a timing window to continue.'

export const INTAKE_BLOCKED_CHAT_MESSAGE =
  'I need a specific destination before we can plan your trip. Please go back and pick a region or city.'

/** Defaults for optional intake fields when coercing partial API/session bodies. */
export const INTAKE_FIELD_DEFAULTS = {
  vibe: 'Culture',
  pace: 'Balanced',
  timing: 'Next 6 months',
  duration: '1-2 weeks',
} as const

export const READINESS_TIER_THRESHOLDS = { hot: 75, warm: 58, nurture: 42 } as const

export const DEFAULT_READINESS_SCORE = 50
export const DEFAULT_READINESS_TIER = 'warm' as const
