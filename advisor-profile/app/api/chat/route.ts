import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai'
import { z } from 'zod'
import { buildConciergeSystemPrompt } from '@/lib/conciergePrompt'
import { getConciergeModel, getModelRotation, hasGeminiApiKey } from '@/lib/aiModel'
import { createMockConciergeResponse } from '@/lib/mockConciergeStream'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import { evaluateHandoffGate, EXPLICIT_OVERRIDE_REGEX } from '@/lib/handoffGates'
import { getTextFromUIMessage } from '@/lib/chatMessages'
import { parseAndValidateIntake } from '@/lib/intakeValidation'
import { createIntakeBlockedConciergeResponse } from '@/lib/guardrails/intakeBlockedStream'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'

export const maxDuration = 60

const MAX_RETRIES = 3

/** Visible reply budget. Kept high so Gemini thinking tokens cannot truncate mid-sentence. */
const CONCIERGE_MAX_OUTPUT_TOKENS = 2048

type ChatRequestBody = {
  messages?: UIMessage[]
  intake?: unknown
}

function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const msg = String((err as { message?: string }).message ?? '')
  const status = (err as { status?: number }).status
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('Quota') ||
    msg.includes('rate') ||
    msg.includes('RATE_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED')
  )
}

export async function POST(req: Request) {
  const rateLimited = await checkRateLimit(req, 'chat', '/api/chat')
  if (rateLimited) return rateLimited

  let body: ChatRequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const intakeValidation = parseAndValidateIntake(body.intake)
  if (!intakeValidation.success) {
    console.warn('[intake-gate]', {
      route: '/api/chat',
      blockedField: intakeValidation.result.blockedField,
      code: 'INTAKE_BLOCKED',
    })
    return createIntakeBlockedConciergeResponse(
      messages,
      intakeValidation.result.message,
      intakeValidation.result.blockedField,
    )
  }

  const intake: MatchIntakePayload = intakeValidation.data

  if (!hasGeminiApiKey()) {
    return createMockConciergeResponse(messages, intake)
  }

  const models = getModelRotation()
  const systemPrompt = buildConciergeSystemPrompt(intake)
  const convertedMessages = await convertToModelMessages(messages)

  const tools = {
    initiate_human_handoff: tool({
      description:
        'Call when the user is ready to book, asks for pricing/availability, or explicitly asks for a human advisor. Provide your assessment of their intent and confidence.',
      inputSchema: z.object({
        intent: z
          .enum(['exploring', 'ready_to_book'])
          .describe('User intent: exploring options or ready to book'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe('Confidence (0-1) that the user wants a human advisor now'),
        reason: z
          .string()
          .describe('Brief reason for handoff, e.g. ready to book or asked for pricing'),
        captured_slots: z
          .object({
            budget: z.string().optional().describe('Confirmed budget if discussed'),
            pax: z.number().nullable().optional().describe('Group size if mentioned'),
            dates: z.string().optional().describe('Travel dates if mentioned'),
          })
          .describe('Slots captured during the conversation'),
      }),
      execute: async ({ intent, confidence, reason }) => {
        const userTurnCount = messages.filter(
          (m: UIMessage) => m.role === 'user',
        ).length

        const lastUserMsg = [...messages]
          .reverse()
          .find((m: UIMessage) => m.role === 'user')
        const lastUserText = lastUserMsg
          ? getTextFromUIMessage(lastUserMsg)
          : ''
        const override = EXPLICIT_OVERRIDE_REGEX.test(lastUserText)

        const gate = evaluateHandoffGate({
          override,
          confidence,
          intent,
          userTurnCount,
        })

        console.log('[handoff]', {
          decision: gate.accepted ? 'accepted' : 'rejected',
          intent,
          confidence,
          userTurnCount,
          override,
          gateReason: gate.reason,
        })

        if (gate.accepted) {
          return { handoffInitiated: true as const, reason }
        }

        return {
          handoffInitiated: false as const,
          reason: gate.reason,
          suggestedFollowUp: gate.suggestedFollowUp,
        }
      },
    }),
  }

  let lastError: unknown = null

  for (const modelId of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = streamText({
          model: getConciergeModel(modelId),
          system: systemPrompt,
          messages: convertedMessages,
          maxOutputTokens: CONCIERGE_MAX_OUTPUT_TOKENS,
          providerOptions: {
            google: {
              // Concierge replies are short; disable thinking so output tokens go to the user-visible text.
              thinkingConfig: { thinkingBudget: 0 },
            },
          },
          stopWhen: stepCountIs(5),
          tools,
        })

        return result.toUIMessageStreamResponse()
      } catch (err) {
        lastError = err
        if (isRateLimitError(err)) {
          // Wait briefly before retry (exponential: 1s, 2s, 4s)
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
          continue
        }
        // Non-rate-limit error: break inner loop, try next model
        break
      }
    }
    // Exhausted retries for this model — move to next
  }

  // All models exhausted — fall back to mock response
  console.error(
    '[chat] All Gemini models rate-limited or failed. Falling back to demo mode.',
    lastError,
  )
  return createMockConciergeResponse(messages, intake)
}
