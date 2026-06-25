export type StepConfig = {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  imageAlt: string
  optional?: boolean
}

export const ONBOARD_STEP_NAMES = [
  'destination',
  'trip-vibe',
  'companions',
  'timing',
  'service-level',
  'priorities',
  'style-budget',
  'location',
  'details',
] as const

export type OnboardStepName = (typeof ONBOARD_STEP_NAMES)[number]

export const POST_WIZARD_STEPS = ['thank-you', 'matching', 'results'] as const
export type PostWizardStep = (typeof POST_WIZARD_STEPS)[number]

export type AllStepName = OnboardStepName | PostWizardStep

export const STEPS: StepConfig[] = [
  {
    id: 'destination',
    title: 'Where do you want to go?',
    subtitle: 'Pick a dream destination or let us surprise you.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Tropical beach destination',
  },
  {
    id: 'trip-vibe',
    title: 'What kind of trip are you dreaming about?',
    subtitle: 'Pick the vibe that feels right — your advisor will tailor everything else.',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Scenic mountain lake',
    optional: true,
  },
  {
    id: 'companions',
    title: "Who's coming with?",
    subtitle: 'Tell us about your travel group.',
    imageUrl: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Group of friends traveling',
  },
  {
    id: 'timing',
    title: 'When and how long are you thinking of traveling?',
    subtitle: 'Exact dates or flexible — both work.',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Calendar and map planning',
  },
  {
    id: 'service-level',
    title: 'What kind of help do you need?',
    subtitle: 'From a single booking to a full itinerary.',
    imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Laptop with travel planning on screen',
  },
  {
    id: 'priorities',
    title: 'Any special trip details or priorities?',
    subtitle: 'Optional — helps us fine-tune your match.',
    imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Safari adventure',
    optional: true,
  },
  {
    id: 'style-budget',
    title: "What's your travel style these days?",
    subtitle: 'Helps us pair you with the right advisor.',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Boutique hotel room',
  },
  {
    id: 'location',
    title: 'Where in the world are you based right now?',
    subtitle: 'So we can coordinate time zones and logistics.',
    imageUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'World map',
  },
  {
    id: 'details',
    title: 'Are there any other details you\'d like to share?',
    subtitle: 'Allergies, mobility needs, special occasions — anything helps.',
    imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Traveler writing notes',
    optional: true,
  },
]

export function stepIndexFromParam(param: string | null): number {
  const allNames = [...ONBOARD_STEP_NAMES, ...POST_WIZARD_STEPS]
  const idx = allNames.indexOf((param ?? 'destination') as AllStepName)
  return idx === -1 ? 0 : idx
}

export function stepNameFromIndex(index: number): AllStepName {
  const allNames = [...ONBOARD_STEP_NAMES, ...POST_WIZARD_STEPS]
  return allNames[index] ?? 'destination'
}

export const TOTAL_WIZARD_STEPS = ONBOARD_STEP_NAMES.length
