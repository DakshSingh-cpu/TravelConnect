import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai'
import { z } from 'zod'
import { buildConciergeSystemPrompt } from '@/lib/conciergePrompt'
import { getConciergeModel, getModelRotation, hasGeminiApiKey } from '@/lib/aiModel'
import { createMockConciergeResponse } from '@/lib/mockConciergeStream'
import {
  defaultIntakePayload,
  parseIntakeBody,
  type MatchIntakePayload,
} from '@/lib/matchAdvisors'

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
  const intake: MatchIntakePayload =
    parseIntakeBody(body.intake) ?? defaultIntakePayload()

  if (!hasGeminiApiKey()) {
    return createMockConciergeResponse(messages, intake)
  }

  const models = getModelRotation()
  const systemPrompt = buildConciergeSystemPrompt(intake)
  const convertedMessages = await convertToModelMessages(messages)

  const tools = {
    initiate_human_handoff: tool({
      description:
        'Call this tool ONLY when the user shows strong intent to book, asks for specific pricing/availability, or explicitly asks to speak to a human advisor. Do not call for general brainstorming.',
      inputSchema: z.object({
        reason: z
          .string()
          .describe('Brief reason for handoff, e.g. ready to book or asked for pricing'),
      }),
      execute: async ({ reason }) => ({
        handoffInitiated: true,
        reason,
      }),
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
