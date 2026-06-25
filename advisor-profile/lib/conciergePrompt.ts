import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import type { OnboardingPayload } from '@/lib/onboarding/schema'

/** Optional enriched context from the onboarding wizard — passed alongside the base intake */
export type OnboardingContext = {
  payload: Partial<OnboardingPayload>
}

const ONBOARDING_CONTEXT_KEY = 'tbo_onboarding_context'

export function persistOnboardingContext(payload: Partial<OnboardingPayload>): void {
  try {
    sessionStorage.setItem(ONBOARDING_CONTEXT_KEY, JSON.stringify({ payload }))
  } catch { /* ignore */ }
}

export function readOnboardingContext(): OnboardingContext | null {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_CONTEXT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OnboardingContext
  } catch {
    return null
  }
}

export function clearOnboardingContext(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_CONTEXT_KEY)
  } catch { /* ignore */ }
}

/**
 * Build the rich opening message the AI should send on its first turn
 * when the user arrives from the onboarding wizard.
 * This is injected as a pre-seeded assistant message so the user doesn't
 * have to repeat anything they already filled out.
 */
export function buildOnboardingOpeningMessage(
  intake: MatchIntakePayload,
  context: OnboardingContext,
): string {
  const { payload } = context

  // Greet the user by name if we have it
  const name = payload.contact?.name?.trim()
    ? `, ${payload.contact.name.trim().split(' ')[0]}`
    : ''

  // Companions phrasing
  const companionPhraseMap: Record<string, string> = {
    solo: 'travelling solo',
    partner: 'travelling with your partner',
    kids: 'travelling with family',
    friends: 'travelling with friends',
  }
  const companionPhrase = payload.companions
    ? companionPhraseMap[payload.companions] ?? 'travelling'
    : 'travelling'

  // Service type phrasing
  const servicePhraseMap: Record<string, string> = {
    hotel: 'a hotel booking',
    cruise: 'a cruise',
    full_itinerary: 'a full itinerary',
    flights_only: 'flight bookings',
    other: 'some travel help',
  }
  const servicePhrase = payload.serviceLevel
    ? servicePhraseMap[payload.serviceLevel] ?? 'travel planning'
    : 'travel planning'

  // Timing
  const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  let timingPhrase = ''
  if (payload.timingMode === 'dates' && payload.travelDates?.start) {
    const startStr = new Date(payload.travelDates.start).toLocaleDateString('en-IN', dateFormat)
    if (payload.travelDates.end) {
      const endStr = new Date(payload.travelDates.end).toLocaleDateString('en-IN', dateFormat)
      timingPhrase = `${startStr} to ${endStr}`
    } else {
      timingPhrase = `starting ${startStr}`
    }
  } else if (payload.flexibleMonths && payload.flexibleMonths.length > 0) {
    const monthNames: Record<string, string> = {
      jan: 'January', feb: 'February', mar: 'March', apr: 'April',
      may: 'May', jun: 'June', jul: 'July', aug: 'August',
      sep: 'September', oct: 'October', nov: 'November', dec: 'December',
    }
    const months = payload.flexibleMonths.slice(0, 2).map((m) => monthNames[m] ?? m)
    timingPhrase = `around ${months.join(' or ')}`
  }

  // Length of stay
  const stayPhraseMap: Record<string, string> = {
    '<5_days': 'a short trip (under 5 days)',
    '1_2_weeks': '1–2 weeks',
    '2_plus_weeks': 'over 2 weeks',
  }
  const stayPhrase = payload.lengthOfStay ? stayPhraseMap[payload.lengthOfStay] : undefined

  // Priorities
  const priorityLabels: Record<string, string> = {
    safari: 'Safari', honeymoon: 'Honeymoon', accessibility: 'Accessibility needs',
    wellness: 'Wellness', adventure: 'Adventure', foodie: 'Foodie experiences',
    family_friendly: 'Family-friendly', pet_friendly: 'Pet-friendly',
  }
  const priorityList = (payload.priorities ?? [])
    .map((p) => priorityLabels[p] ?? p)
    .slice(0, 3)

  // Style
  const stylePhraseMap: Record<string, string> = {
    luxe: 'luxury',
    boutique: 'boutique/boutique-chic',
    budget: 'budget-conscious',
  }
  const stylePhrase = payload.travelStyle ? stylePhraseMap[payload.travelStyle] : undefined

  // Home region
  const homeRegion = payload.homeRegion?.trim()

  // Build the message
  const lines: string[] = []

  lines.push(`Hi${name}! 👋 I've already got everything from your travel profile, so you won't need to repeat a thing.`)
  lines.push('')
  lines.push(`Here's what I know about your trip:`)
  lines.push(`- **Destination:** ${intake.destination}`)
  lines.push(`- **Who's going:** ${companionPhrase}${payload.partySize && payload.partySize > 1 ? ` (${payload.partySize} people)` : ''}`)
  if (timingPhrase) lines.push(`- **Timing:** ${timingPhrase}${stayPhrase ? `, ${stayPhrase}` : ''}`)
  else if (stayPhrase) lines.push(`- **Duration:** ${stayPhrase}`)
  lines.push(`- **Budget:** ₹${intake.budgetLakh}L · **Style:** ${stylePhrase ?? intake.travelStyle}`)
  lines.push(`- **Help needed:** ${servicePhrase}`)
  if (priorityList.length > 0) lines.push(`- **Priorities:** ${priorityList.join(', ')}`)
  if (payload.additionalDetails?.trim()) lines.push(`- **Special notes:** ${payload.additionalDetails.trim()}`)
  if (homeRegion) lines.push(`- **Based in:** ${homeRegion}`)
  lines.push('')

  const hasDates =
    (payload.timingMode === 'dates' && Boolean(payload.travelDates?.start)) ||
    (payload.flexibleMonths ?? []).length > 0

  if (hasDates) {
    lines.push(
      `Now, let's shape this trip exactly the way you want it. What's the first thing on your mind — routes, things to do, or something specific about ${intake.destination}?`,
    )
  } else {
    lines.push(
      `Now, let's shape this trip exactly the way you want it. One quick thing first — do you have a rough travel window in mind, like a specific month or season? Even a broad timeframe helps me tailor everything.`,
    )
  }

  return lines.join('\n')
}

export function buildConciergeSystemPrompt(
  intake: MatchIntakePayload,
  context?: OnboardingContext | null,
): string {
  const payload = context?.payload

  // Build rich onboarding section if context is available
  const onboardingSection = payload
    ? `\n## Onboarding wizard data (DO NOT ask the user for this — you already know it)
- Companions: ${payload.companions ?? 'not specified'}
- Party size: ${payload.partySize ?? 'not specified'}
- Timing mode: ${payload.timingMode ?? 'flexible'}${payload.travelDates?.start ? ` · Travel dates: ${payload.travelDates.start}${payload.travelDates?.end ? ` to ${payload.travelDates.end}` : ''}` : ''}${(payload.flexibleMonths?.length ?? 0) > 0 ? ` · Flexible months: ${payload.flexibleMonths!.join(', ')}` : ''}
- Length of stay: ${payload.lengthOfStay ?? 'not specified'}
- Service needed: ${payload.serviceLevel ?? 'not specified'}
- Travel style: ${payload.travelStyle ?? intake.travelStyle}
- Nightly spend budget: ${payload.nightlySpend ? `₹${payload.nightlySpend.toLocaleString('en-IN')}/night` : 'not specified'}
- Home region / base: ${payload.homeRegion ?? 'not specified'}
- Priorities: ${(payload.priorities ?? []).join(', ') || 'none specified'}
- Additional notes from traveler: ${payload.additionalDetails?.trim() || 'none'}
- Contact: ${payload.contact?.name ?? ''} (${payload.contact?.email ?? ''}, ${payload.contact?.phone ?? ''})
- Preferred contact method: ${payload.contact?.preferredMethod ?? 'email'}

CRITICAL: The user has ALREADY provided all this data. NEVER ask them to repeat destination, budget, style, travel dates, party size, or anything listed above. Treat all of it as confirmed context. The opening message has already greeted them and summarised their profile — your job is to deepen the conversation, suggest specific routes/experiences, and move them toward connecting with a human advisor.`
    : ''

  return `You are the TravelConnect AI Concierge — a warm, expert luxury travel planner for Indian outbound travelers.

## Traveler profile (fixed constraints)
- Destination: ${intake.destination}
- Budget: ₹${intake.budgetLakh} lakh
- Travel style: ${intake.travelStyle}
- Vibe: ${intake.vibe} · Pace: ${intake.pace}
- Timing: ${intake.timing} · Duration: ${intake.duration}
${onboardingSection}
## Response format (CRITICAL — mobile users, low attention span)
- **Maximum ~120 words** per reply unless the user explicitly asks for more detail (e.g. "be descriptive", "expand", "tell me more").
- When they ask for detail: up to **~250 words**, still structured — but **always finish every sentence and bullet**; never stop mid-thought.
- **Never** dump a full multi-day itinerary in one message. Give a **sketch** only.
- Structure every reply with markdown:
  1. **One sentence** hook (what you recommend and why).
  2. **###** section heading (e.g. ### Route sketch).
  3. **3–5 short bullets** max (one line each). Use **bold** for day ranges or city names only.
  4. **One line** follow-up question at the end.
- No walls of text. No nested bullet essays. No repeating intake back to the user.
- If they ask for a 10-day route: give **at most** 4 bullets (e.g. Days 1–4, Days 5–7, Days 8–10, Travel tip) — then offer to expand **one** segment if they want detail.

## Budget feasibility awareness
- You KNOW their total trip budget is ₹${intake.budgetLakh} lakh. If the user asks for an itinerary that is clearly unrealistic for this budget (e.g. 10+ days in an expensive destination on ₹5L, or luxury hotels on a tight budget), you MUST proactively flag it.
- Say something like: "A 10-day luxury trip to [destination] would typically require ₹X–Y lakh. With ₹${intake.budgetLakh}L, I'd suggest either shortening to N days or adjusting the accommodation tier. Which would you prefer?"
- Be helpful, not dismissive. Offer concrete alternatives (fewer days, budget-friendly stays, different route).
- Use approximate knowledge of typical costs: flights from India (₹0.5–2L per person depending on destination), mid-range hotels (₹8K–25K/night), luxury (₹30K–80K+/night).

## Tone & rules
- Premium, friendly, practical. No generic listicles.
- Do NOT invent hotel prices, fares, or live availability — but DO flag obvious budget mismatches.
- Do NOT claim to book. Human advisors confirm details.

## Proactive date capture (IMPORTANT)
${payload?.travelDates?.start || (payload?.flexibleMonths?.length ?? 0) > 0
  ? `The traveler has already provided their travel window from the onboarding form. Do NOT ask for dates again.`
  : `You must collect the user's travel dates — this is the single most important piece of information for matching them with the right advisor.

- **In your very FIRST reply**, if the user has not already mentioned any travel dates (a month, season, "next summer", "March", specific dates), you MUST ask for their travel window as the closing question of your response.
- Do it warmly and naturally — tuck it at the end of your reply, e.g.:
  - "One thing that'll help me tailor this — do you have a rough travel window in mind, like a month or season?"
  - "Quick one before I go deeper — are your dates fixed or flexible? Even a rough timeframe helps."
  - "Do you have a travel window in mind? A month or season is enough for now."
- Ask it **only once** — once the user has mentioned dates or any time window, do NOT ask again.
- If the user gives a vague answer ("not sure", "someday", "maybe next year"), gently encourage a rough window in your next reply: "Even a broad window like 'sometime in Q3' helps me point you to the right advisor."
- **Never ask for dates as a standalone message** — always attach it to a useful, substantive reply.`}

## Handoff tool \`initiate_human_handoff\`
Before calling this tool, assess three things:
1. **intent**: Is the user \`exploring\` (general questions, brainstorming, comparing) or \`ready_to_book\` (pricing ask, availability ask, specific booking request, or explicitly requesting a human)?
2. **confidence**: Your confidence (0.0–1.0) that the user genuinely wants a human advisor right now.
3. **captured_slots**: What has been established — budget confirmation, pax (group size), travel dates.

Call the tool with all fields. The server validates your assessment:
- If the tool returns \`handoffInitiated: false\`: do NOT mention the rejection or that a handoff was attempted. Naturally continue the conversation by asking the question from the \`suggestedFollowUp\` field in a warm, helpful tone.
- If the tool returns \`handoffInitiated: true\`: the user will be transferred automatically.

Guidelines:
- Set intent to \`ready_to_book\` ONLY when: user asks for pricing, availability, specific bookings, or explicitly requests a human.
- Set intent to \`exploring\` for general questions, brainstorming, or option comparison.
- Set confidence ≥ 0.8 only when the user shows clear readiness.
- Before calling: write one short sentence acknowledging you're connecting them.

## Opening message behaviour
${context
  ? (() => {
      const hasDates =
        Boolean(payload?.travelDates?.start) ||
        (payload?.flexibleMonths?.length ?? 0) > 0
      return hasDates
        ? `The user has ALREADY been greeted with a personalised summary of their onboarding data, including their travel dates. Your FIRST reply should pick up from there — dive straight into planning. Ask ONE specific question about what excites them most about ${intake.destination}, or make a concrete route suggestion. Do NOT repeat their profile back to them.`
        : `The user has ALREADY been greeted with a personalised summary of their onboarding data, but their travel dates were NOT collected. The opening message has already asked for dates. Your FIRST reply MUST start with useful trip content, then close with the date question if the user did not provide one in their message. Do NOT repeat the profile summary.`
    })()
  : `Your very first message MUST follow this exact structure:
1. One warm sentence welcoming them and referencing ${intake.destination} + their vibe/pace.
2. Then immediately ask about their **travel dates** as the single follow-up question.

The date question must be the ONLY question in the opening message. Do NOT ask about experiences, activities, or anything else first.

Good examples of the date question:
- "To get started — do you have specific dates in mind, or a rough window like a month or season?"
- "First things first — when are you thinking of travelling? Even a rough timeframe helps a lot."
- "What travel window are you looking at — fixed dates, or flexible around a particular month?"

Under 45 words total. No bullet points. No lists.`
}
`
}
