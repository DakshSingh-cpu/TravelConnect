/** Shared E2E constants — values come from env (see e2e/env.example). */
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export const CRON_SECRET = process.env.CRON_SECRET ?? ''

/** Supabase test phone (E.164 without +): configure in Auth → Phone → Test numbers. */
export const MOCK_PHONE = process.env.E2E_MOCK_PHONE ?? '919205025389'
export const MOCK_OTP = process.env.E2E_MOCK_OTP ?? '123456'

/** Valid 6-digit Indian PIN returned by mocked geolocation in E2E. */
export const TEST_RESIDENTIAL_ZIP = process.env.E2E_RESIDENTIAL_ZIP ?? '110001'

export const WAIT_SCREEN_TEXT = /We're reviewing your trip request/i

export const SERIOUS_CONCIERGE_MESSAGES = [
  'I would like to plan a trip to Japan for 2 weeks in October.',
  'Our budget is around 15 lakh for two adults. We want Tokyo and Kyoto with a mix of culture and food.',
  'We are ready to talk to a human advisor and can travel October 5–19.',
] as const

export const SPEEDRUN_PASTE_PARAGRAPH = `
I want the cheapest possible trip anywhere in the world for 50 people next week with no budget
and no dates and we will figure everything out later just book flights and hotels and also
please send me a full itinerary for 30 countries in 5 days with visa help and travel insurance
and airport transfers and we need luxury hotels but we only want to spend 5000 rupees total
and we are not sure where we want to go maybe Europe or Asia or both at the same time.
`.trim()
