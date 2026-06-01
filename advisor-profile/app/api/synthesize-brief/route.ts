import { generateObject, type UIMessage } from 'ai'
import { z } from 'zod'
import {
  advisorBriefSchema,
  buildFallbackBrief,
  type AdvisorBrief,
} from '@/lib/advisorBrief'
import { getConciergeModel, hasGeminiApiKey } from '@/lib/aiModel'
import {
  defaultIntakePayload,
  parseIntakeBody,
  type MatchIntakePayload,
} from '@/lib/matchAdvisors'
import { getTextFromUIMessage, serializeMessagesForBrief } from '@/lib/chatMessages'

export const maxDuration = 60

type SynthesizeBody = {
  messages?: UIMessage[]
  intake?: unknown
}

function formatTranscript(messages: Array<{ role: string; content: string }>): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
}

export async function POST(req: Request) {
  let body: SynthesizeBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const intake: MatchIntakePayload =
    parseIntakeBody(body.intake) ?? defaultIntakePayload()
  const uiMessages = Array.isArray(body.messages) ? body.messages : []
  const transcript = serializeMessagesForBrief(uiMessages)

  if (!hasGeminiApiKey()) {
    const lastAssistant = [...uiMessages]
      .reverse()
      .find((m) => m.role === 'assistant')
    const summary = lastAssistant ? getTextFromUIMessage(lastAssistant) : undefined
    const brief = buildFallbackBrief(intake, summary)
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

## Concierge conversation
${transcript.length > 0 ? formatTranscript(transcript) : '(No chat messages — use intake only)'}

Rules:
- tldr: exactly two sentences
- hard_constraints.budget: use lakh format
- hard_constraints.dates: combine timing + duration; no invented calendar dates unless user stated them in chat
- hard_constraints.pax: number if mentioned in chat, else null
- key_decisions: 3–6 bullets of choices the traveler already made or agreed to
- advisor_action_items: 3–5 concrete next steps for the human advisor`,
    })

    return Response.json({ brief: object as AdvisorBrief, source: 'llm' as const })
  } catch (error) {
    console.error('[synthesize-brief]', error)
    const brief = buildFallbackBrief(intake)
    return Response.json({ brief, source: 'fallback_error' as const })
  }
}
