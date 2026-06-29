import type { UIMessage } from 'ai'
import { getTextFromUIMessage } from '@/lib/chatMessages'

/**
 * Hard caps on LLM request size to bound cost/abuse on the unauthenticated
 * concierge endpoints. These are deliberately generous for real conversations
 * but reject pathological payloads (huge histories / giant pasted blobs).
 */
export const MAX_LLM_MESSAGES = 60
export const MAX_LLM_TOTAL_INPUT_CHARS = 24_000

export type InputLimitResult =
  | { ok: true }
  | { ok: false; reason: string; code: 'INPUT_TOO_LARGE' }

export function checkLlmInputLimits(messages: UIMessage[]): InputLimitResult {
  if (messages.length > MAX_LLM_MESSAGES) {
    return {
      ok: false,
      code: 'INPUT_TOO_LARGE',
      reason: `Conversation exceeds the maximum of ${MAX_LLM_MESSAGES} messages.`,
    }
  }

  let total = 0
  for (const m of messages) {
    total += getTextFromUIMessage(m).length
    if (total > MAX_LLM_TOTAL_INPUT_CHARS) {
      return {
        ok: false,
        code: 'INPUT_TOO_LARGE',
        reason: `Conversation exceeds the maximum input size of ${MAX_LLM_TOTAL_INPUT_CHARS} characters.`,
      }
    }
  }

  return { ok: true }
}

type UsageLike = {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

/**
 * Structured, PII-free usage logging for an LLM call. Emits a single line that
 * can be picked up by log-based metrics/billing dashboards.
 */
export function logLlmUsage(
  route: string,
  modelId: string,
  usage: UsageLike | undefined,
  extra?: Record<string, string | number | boolean>,
): void {
  console.info('[llm-usage]', {
    route,
    model: modelId,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
    ...extra,
  })
}
