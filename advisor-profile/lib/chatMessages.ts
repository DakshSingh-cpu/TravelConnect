import type { UIMessage } from 'ai'

export interface HandoffToolOutput {
  handoffInitiated: boolean
  reason?: string
  suggestedFollowUp?: string
}

export function getTextFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim()
}

function parseToolOutput(rawOutput: unknown): HandoffToolOutput | null {
  let output: unknown = rawOutput
  if (typeof output === 'string') {
    try {
      output = JSON.parse(output)
    } catch {
      return null
    }
  }
  if (output && typeof output === 'object' && 'handoffInitiated' in output) {
    return output as HandoffToolOutput
  }
  return null
}

/** Extracts the most recent handoff tool output from the message stream. */
export function getHandoffToolOutput(messages: UIMessage[]): HandoffToolOutput | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (
        part.type === 'tool-initiate_human_handoff' &&
        part.state === 'output-available'
      ) {
        const output = parseToolOutput((part as Record<string, unknown>).output)
        if (output) return output
      }
    }
  }
  return null
}

/** Returns true only if the stream contains an accepted handoff (handoffInitiated === true). */
export function hasCompletedHandoffTool(messages: UIMessage[]): boolean {
  const output = getHandoffToolOutput(messages)
  return output?.handoffInitiated === true
}

/** Per-message check: does this specific assistant message contain an accepted handoff? */
export function messageHasAcceptedHandoff(message: UIMessage): boolean {
  for (const part of message.parts) {
    if (
      part.type === 'tool-initiate_human_handoff' &&
      part.state === 'output-available'
    ) {
      const output = parseToolOutput((part as Record<string, unknown>).output)
      if (output?.handoffInitiated === true) return true
    }
  }
  return false
}

export function serializeMessagesForBrief(
  messages: UIMessage[],
): Array<{ role: string; content: string }> {
  return messages
    .map((m) => ({
      role: m.role,
      content: getTextFromUIMessage(m),
    }))
    .filter((m) => m.content.length > 0)
}
