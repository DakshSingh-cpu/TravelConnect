import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type UIMessage,
} from 'ai'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import { getTextFromUIMessage } from '@/lib/chatMessages'
function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    const text = getTextFromUIMessage(m)
    if (text.trim()) return text.trim()
  }
  return ''
}

function mockReply(intake: MatchIntakePayload, userText: string): string {
  const lower = userText.toLowerCase()
  if (!userText) {
    return `Welcome — let's shape your **${intake.destination}** trip at a ${intake.pace.toLowerCase()} pace within **₹${intake.budgetLakh}L**.\n\nWhat's the one experience your family can't miss?`
  }
  if (
    lower.includes('human') ||
    lower.includes('advisor') ||
    lower.includes('book') ||
    lower.includes('price') ||
    lower.includes('availability')
  ) {
    return `You're ready for a verified advisor to confirm pricing and availability for **${intake.destination}**.\n\nTap **Connect to Advisor** when you'd like me to hand off.`
  }
  if (lower.includes('10-day') || lower.includes('route') || lower.includes('sketch')) {
    return `For a balanced **10-day** cultural family trip in Europe, I'd start with **Rome + Florence** — rich history without rushing.\n\n### Route sketch\n- **Days 1–4:** Rome — Colosseum, Vatican (book early), Trastevere evenings\n- **Day 5:** High-speed train to Florence\n- **Days 6–9:** Uffizi, Duomo, optional Tuscan day trip\n- **Day 10:** Departure\n\nWant me to expand **Rome** or **Florence** first?`
  }
  return `Happy to refine **${userText}** for ${intake.destination} at ₹${intake.budgetLakh}L — tell me your must-see city or max travel days between stops.`
}

export function createMockConciergeResponse(
  messages: UIMessage[],
  intake: MatchIntakePayload,
): Response {
  const userText = lastUserText(messages)
  const text = mockReply(intake, userText)
  const shouldHandoff =
    /human|advisor|book|price|availability|connect me/i.test(userText)

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) => {
      const id = generateId()
      writer.write({ type: 'text-start', id })
      writer.write({ type: 'text-delta', id, delta: text })
      writer.write({ type: 'text-end', id })

      if (shouldHandoff) {
        const toolCallId = generateId()
        writer.write({
          type: 'tool-input-start',
          toolCallId,
          toolName: 'initiate_human_handoff',
        })
        writer.write({
          type: 'tool-input-available',
          toolCallId,
          toolName: 'initiate_human_handoff',
          input: { reason: 'User requested human advisor (demo mode)' },
        })
        writer.write({
          type: 'tool-output-available',
          toolCallId,
          output: {
            handoffInitiated: true,
            intent: 'ready_to_book',
            confidence: 1,
            reason: 'Demo mode handoff',
          },
        })
      }
    },
  })

  return createUIMessageStreamResponse({ stream })
}
