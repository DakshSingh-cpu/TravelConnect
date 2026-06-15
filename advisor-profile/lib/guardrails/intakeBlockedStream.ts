import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type UIMessage,
} from 'ai'
import { INTAKE_BLOCKED_CHAT_MESSAGE } from '@/lib/guardrails/constants'
import type { IntakeBlockedField } from '@/lib/intakeValidation'

/**
 * AI-SDK-safe response when intake fails validation on POST /api/chat.
 * Returns a synthetic assistant message stream — no LLM call.
 */
export function createIntakeBlockedConciergeResponse(
  messages: UIMessage[],
  message: string = INTAKE_BLOCKED_CHAT_MESSAGE,
  blockedField?: IntakeBlockedField,
): Response {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) => {
      const id = generateId()
      writer.write({ type: 'text-start', id })
      writer.write({ type: 'text-delta', id, delta: message })
      writer.write({ type: 'text-end', id })
    },
  })

  const headers: Record<string, string> = {
    'X-Intake-Blocked': 'true',
  }
  if (blockedField) {
    headers['X-Intake-Blocked-Field'] = blockedField
  }

  return createUIMessageStreamResponse({ stream, headers })
}
