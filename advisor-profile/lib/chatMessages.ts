import type { UIMessage } from 'ai'

export function getTextFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim()
}

export function hasCompletedHandoffTool(messages: UIMessage[]): boolean {
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (
        part.type === 'tool-initiate_human_handoff' &&
        part.state === 'output-available'
      ) {
        return true
      }
    }
  }
  return false
}

export function serializeMessagesForBrief(messages: UIMessage[]): Array<{ role: string; content: string }> {
  return messages
    .map((m) => ({
      role: m.role,
      content: getTextFromUIMessage(m),
    }))
    .filter((m) => m.content.length > 0)
}
