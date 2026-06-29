import { z } from 'zod'
import { todayLocalISO } from './dates'

export const companionOptions = ['solo', 'partner', 'kids', 'friends'] as const
export type Companion = (typeof companionOptions)[number]

export const timingModes = ['dates', 'flexible'] as const
export type TimingMode = (typeof timingModes)[number]

export const lengthOfStayOptions = ['<5_days', '1_2_weeks', '2_plus_weeks'] as const
export type LengthOfStay = (typeof lengthOfStayOptions)[number]

export const serviceLevelOptions = [
  'hotel',
  'cruise',
  'full_itinerary',
  'flights_only',
  'other',
] as const
export type ServiceLevel = (typeof serviceLevelOptions)[number]

export const priorityOptions = [
  'safari',
  'honeymoon',
  'accessibility',
  'wellness',
  'adventure',
  'foodie',
  'family_friendly',
  'pet_friendly',
] as const
export type Priority = (typeof priorityOptions)[number]

export const travelStyleOptions = ['luxe', 'boutique', 'budget'] as const
export type TravelStyle = (typeof travelStyleOptions)[number]

export const contactMethodOptions = ['email', 'phone', 'whatsapp'] as const
export type ContactMethod = (typeof contactMethodOptions)[number]

export const attributionOptions = [
  'google',
  'instagram',
  'tiktok',
  'facebook',
  'friend',
  'blog',
  'other',
] as const
export type AttributionSource = (typeof attributionOptions)[number]

export const flexibleMonths = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const

export const tripVibeOptions = [
  'scenic_nature',
  'somewhere_warm',
  'city_culture',
  'beach_islands',
  'mountains',
  'coastal_escape',
  'surprise_me',
] as const
export type TripVibe = (typeof tripVibeOptions)[number]

// ── Per-step schemas ────────────────────────────────────────────────────────

export const step01Schema = z.object({
  destination: z.string().trim().min(3, 'Please enter a destination.'),
})

export const stepTripVibeSchema = z.object({
  tripVibe: z.enum(tripVibeOptions).optional(),
})

export const step02Schema = z.object({
  companions: z.enum(companionOptions),
  partySize: z.number().int().min(1).max(50),
})

export const step03Schema = z.object({
  timingMode: z.enum(timingModes),
  travelDates: z
    .object({ start: z.string().optional(), end: z.string().optional() })
    .optional(),
  lengthOfStay: z.enum(lengthOfStayOptions).optional(),
  flexibleMonths: z.array(z.enum(flexibleMonths)).optional(),
})

/**
 * Step 03 with runtime date guards layered on top of the base shape.
 *
 * Rejects travel dates in the past (anchored to the traveller's current local
 * date) and an end date earlier than the start. Kept separate from
 * `step03Schema` so the base object's `.shape` stays available for the full
 * payload schema below.
 */
export const step03ValidationSchema = step03Schema.superRefine((data, ctx) => {
  if (data.timingMode !== 'dates') return

  const today = todayLocalISO()
  const start = data.travelDates?.start
  const end = data.travelDates?.end

  if (start && start < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start date can't be in the past.",
      path: ['travelDates', 'start'],
    })
  }

  if (end && ((start && end < start) || end < today)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be on or after the start date.',
      path: ['travelDates', 'end'],
    })
  }
})

export const step04Schema = z.object({
  serviceLevel: z.enum(serviceLevelOptions),
})

export const step05Schema = z.object({
  priorities: z.array(z.enum(priorityOptions)).optional(),
})

export const step06Schema = z.object({
  travelStyle: z.enum(travelStyleOptions),
  nightlySpend: z.number().min(0).max(10_000_000).optional(),
})

export const step07Schema = z.object({
  homeRegion: z.string().trim().min(1, 'Please select your region.'),
})

export const step08Schema = z.object({
  additionalDetails: z.string().max(2000).optional(),
})

export const step09Schema = z.object({
  contact: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    email: z.string().trim().email('Please enter a valid email.'),
    phone: z.string().trim().min(10, 'Please enter a valid phone number.'),
    preferredMethod: z.enum(contactMethodOptions),
    language: z.string().trim().min(1, 'Please select a language.'),
  }),
})

export const step10Schema = z.object({
  attribution: z.enum(attributionOptions),
  attributionOther: z.string().max(200).optional(),
})

// ── Full payload ────────────────────────────────────────────────────────────

export const onboardingPayloadSchema = z.object({
  destination: step01Schema.shape.destination,
  tripVibe: stepTripVibeSchema.shape.tripVibe,
  companions: step02Schema.shape.companions,
  partySize: step02Schema.shape.partySize,
  timingMode: step03Schema.shape.timingMode,
  travelDates: step03Schema.shape.travelDates,
  lengthOfStay: step03Schema.shape.lengthOfStay,
  flexibleMonths: step03Schema.shape.flexibleMonths,
  serviceLevel: step04Schema.shape.serviceLevel,
  priorities: step05Schema.shape.priorities,
  travelStyle: step06Schema.shape.travelStyle,
  nightlySpend: step06Schema.shape.nightlySpend,
  homeRegion: step07Schema.shape.homeRegion,
  additionalDetails: step08Schema.shape.additionalDetails,
  contact: step09Schema.shape.contact.optional(),
  attribution: step10Schema.shape.attribution.optional(),
  attributionOther: step10Schema.shape.attributionOther.optional(),
})

export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>

// ── Step validation helpers ─────────────────────────────────────────────────

export const stepSchemas = [
  step01Schema,       // destination
  stepTripVibeSchema, // trip-vibe (optional)
  step02Schema,       // companions
  step03ValidationSchema, // timing
  step04Schema,       // service-level
  step05Schema,       // priorities (optional)
  step06Schema,       // style-budget
  step07Schema,       // location
  step08Schema,       // details (optional)
] as const

/** Returns true if the slice of data for `stepIndex` is valid. */
export function validateStep(stepIndex: number, data: Partial<OnboardingPayload>): boolean {
  const schema = stepSchemas[stepIndex]
  if (!schema) return true
  return schema.safeParse(data).success
}
