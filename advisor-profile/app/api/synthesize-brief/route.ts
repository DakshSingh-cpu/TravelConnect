import { generateObject, type UIMessage } from 'ai'
import {
  advisorBriefSchema,
  buildFallbackBrief,
  type AdvisorBrief,
} from '@/lib/advisorBrief'
import { getConciergeModel, hasGeminiApiKey } from '@/lib/aiModel'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import { getTextFromUIMessage, serializeMessagesForBrief } from '@/lib/chatMessages'
import { requireValidIntake } from '@/lib/guardrails/intakeGate'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { normalizeAdvisorBrief } from '@/lib/guardrails/readiness'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

type OnboardingContextPayload = {
  travelDates?: { start?: string; end?: string }
  flexibleMonths?: string[]
  timingMode?: string
}

type SynthesizeBody = {
  messages?: UIMessage[]
  intake?: unknown
  onboardingContext?: { payload?: OnboardingContextPayload } | null
}

function formatTranscript(messages: Array<{ role: string; content: string }>): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
}

function countUserTurns(messages: UIMessage[]): number {
  return messages.filter((m) => m.role === 'user').length
}

function finalizeBrief(
  brief: AdvisorBrief,
  intake: MatchIntakePayload,
  userTurnCount: number,
  phoneVerified?: boolean,
): AdvisorBrief {
  const normalized = normalizeAdvisorBrief(brief, intake, userTurnCount, phoneVerified)
  console.info('[readiness-score]', {
    route: '/api/synthesize-brief',
    tier: normalized.readiness_tier,
    score: normalized.readiness_score,
    phoneVerified: Boolean(phoneVerified),
  })
  return normalized
}

function buildWizardDatesSection(payload: OnboardingContextPayload | null): string {
  if (!payload) return ''

  const hasDates = payload.timingMode === 'dates' && Boolean(payload.travelDates?.start)
  const hasFlexible = (payload.flexibleMonths ?? []).length > 0

  if (!hasDates && !hasFlexible) return ''

  const lines: string[] = [
    '\n## Confirmed onboarding wizard data (treat as user-provided — DO count toward readiness)',
  ]

  if (hasDates) {
    const start = payload.travelDates!.start!
    const end = payload.travelDates?.end
    lines.push(
      `- Travel dates confirmed in onboarding form: ${start}${end ? ` → ${end}` : ''} (specific dates slot filled — score +15 for readiness)`,
    )
  } else if (hasFlexible) {
    const months = (payload.flexibleMonths ?? []).join(', ')
    lines.push(
      `- Flexible travel months confirmed in onboarding form: ${months} (travel window slot filled — score +10 for readiness)`,
    )
  }

  lines.push(
    'These values were provided by the traveler via the onboarding form before the chat began. Count them as confirmed slots when scoring readiness.',
  )

  return lines.join('\n')
}

const READINESS_SCORING_PROMPT = `
## Readiness scoring
Score this lead's booking readiness from 0–100 (start baseline 50) using these signals:

POSITIVE signals (add points):
- Budget was stated without prompting → +12
- Specific travel dates or window confirmed → +10
- Named exact destination (city, not just country) → +8
- Group size / pax mentioned → +7
- Asked about visa, insurance, or logistics → +6
- Mentioned a past trip or travel brand by name → +5
- Replied quickly and concisely (engaged tone) → +4

NEGATIVE signals (subtract points):
- Budget was vague, refused, or contradicts ask → −15
- Travel dates are "TBD" or "someday" → −12
- Used phrases like "just exploring", "not sure", "maybe", "I don't know" → −15
- **User gave even ONE vague non-answer (e.g. "I don't know", "not sure", "I'm not sure", "maybe next year", "just looking") → −20**
- Contradicts own budget (luxury ask on economy budget) → −8
- Asked for free alternatives or DIY tips → −6
- Session had fewer than 3 meaningful user turns → −15
- User gave only 1-word or deflecting replies (e.g. "ok", "sure", "hmm") → −12
- User only asked the AI to generate an itinerary but never engaged with specifics → −10

CRITICAL RULES:
1. If the user has fewer than 3 substantive messages, the score MUST be below 42.
2. If ANY user message contains "not sure", "I don't know", "maybe", "just looking", "just browsing", or similar deflections, the score MUST be below 42.
3. If the user only said a greeting (e.g. "Hello", "Hi") and asked for one thing without follow-up engagement, the score MUST be below 35.
4. Do NOT let the concierge's helpful responses inflate the score. Only count what the USER themselves contributed.
5. A user who asks for an itinerary but then responds with "I'm not sure" or deflects is NOT a hot lead — score below 40.

Set readiness_tier from readiness_score:
- 75–100 → "hot"
- 58–74 → "warm"
- 42–57 → "nurture"
- 0–41 → "blocked"

List up to 3 bullets in low_intent_signals for signals that meaningfully reduced the score.`


export async function POST(req: Request) {
  const rateLimited = await checkRateLimit(req, 'synthesize-brief', '/api/synthesize-brief')
  if (rateLimited) return rateLimited

  let body: SynthesizeBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const intakeResult = requireValidIntake(body.intake, '/api/synthesize-brief')
  if ('response' in intakeResult) {
    return intakeResult.response
  }
  const intake: MatchIntakePayload = intakeResult.intake

  const onboardingPayload = body.onboardingContext?.payload ?? null
  const wizardDatesSection = buildWizardDatesSection(onboardingPayload)

  const uiMessages = Array.isArray(body.messages) ? body.messages : []
  const transcript = serializeMessagesForBrief(uiMessages)
  const userTurnCount = countUserTurns(uiMessages)

  let phoneVerified = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    phoneVerified = Boolean(user?.phone)
  } catch {
    // Not authenticated or cookie unavailable — no boost
  }

  if (!hasGeminiApiKey()) {
    const lastAssistant = [...uiMessages]
      .reverse()
      .find((m) => m.role === 'assistant')
    const summary = lastAssistant ? getTextFromUIMessage(lastAssistant) : undefined
    const brief = finalizeBrief(buildFallbackBrief(intake, summary), intake, userTurnCount, phoneVerified)
    if (brief.readiness_tier === 'blocked') {
      return Response.json(
        {
          message:
            'Based on your chat, we need a bit more detail before connecting you with an advisor. Share your travel dates, group size, or whether you\'re ready to book — then try again.',
        },
        { status: 422 },
      )
    }
    return Response.json({ brief, source: 'fallback' as const })
  }

  try {
    const { object } = await generateObject({
      model: getConciergeModel(),
      schema: advisorBriefSchema,
      schemaName: 'AdvisorBrief',
      schemaDescription:
        'Structured handoff brief for a human travel advisor — scannable, actionable, no fluff',
      prompt: `Create an Advisor Brief for a human TravelConnect travel advisor based on the intake form and AI concierge chat below.

## Intake (authoritative constraints)
- Destination: ${intake.destination}
- Budget: ₹${intake.budgetLakh} lakh
- Travel style: ${intake.travelStyle}
- Vibe: ${intake.vibe}
- Pace: ${intake.pace}
- Timing: ${intake.timing}
- Duration: ${intake.duration}
${wizardDatesSection}
## Concierge conversation
${transcript.length > 0 ? formatTranscript(transcript) : '(No chat messages — use intake only)'}

Rules:
- tldr: exactly two sentences
- hard_constraints.budget: use lakh format
- hard_constraints.dates: combine timing + duration; no invented calendar dates unless user stated them in chat
- hard_constraints.pax: number if mentioned in chat, else null
- key_decisions: 3–6 bullets of choices the traveler already made or agreed to
- advisor_action_items: 3–5 concrete next steps for the human advisor
${READINESS_SCORING_PROMPT}`,
    })

    const parsed = advisorBriefSchema.safeParse(object)
    const brief = parsed.success
      ? parsed.data
      : buildFallbackBrief(intake)

    const finalizedBrief = finalizeBrief(brief, intake, userTurnCount, phoneVerified)
    if (finalizedBrief.readiness_tier === 'blocked') {
      console.info('[readiness-gate] synthesize-brief blocked handoff', {
        score: finalizedBrief.readiness_score,
        tier: finalizedBrief.readiness_tier,
        signals: finalizedBrief.low_intent_signals,
      })
      return Response.json(
        {
          message:
            'Based on your chat, we need a bit more detail before connecting you with an advisor. Share your travel dates, group size, or whether you\'re ready to book — then try again.',
        },
        { status: 422 },
      )
    }
    return Response.json({ brief: finalizedBrief, source: 'llm' as const })
  } catch (error) {
    console.error('[synthesize-brief]', error)
    const brief = finalizeBrief(buildFallbackBrief(intake), intake, userTurnCount, phoneVerified)
    if (brief.readiness_tier === 'blocked') {
      return Response.json(
        {
          message:
            'Based on your chat, we need a bit more detail before connecting you with an advisor. Share your travel dates, group size, or whether you\'re ready to book — then try again.',
        },
        { status: 422 },
      )
    }
    return Response.json({ brief, source: 'fallback_error' as const })
  }
}
