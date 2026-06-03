export const EXPLICIT_OVERRIDE_REGEX =
  /(talk to (a )?human|connect.*advisor|speak to an advisor)/i

export interface HandoffGateInput {
  override: boolean
  confidence: number
  intent: string
  userTurnCount: number
}

export interface HandoffGateResult {
  accepted: boolean
  reason: string
  suggestedFollowUp?: string
}

/**
 * Pure function evaluating whether a handoff attempt should be accepted.
 * Gates are checked in priority order: override → confidence → intent → turn count.
 */
export function evaluateHandoffGate(input: HandoffGateInput): HandoffGateResult {
  if (input.override) {
    return { accepted: true, reason: 'User explicitly requested human advisor' }
  }

  if (input.confidence < 0.75) {
    return {
      accepted: false,
      reason: `Confidence too low (${input.confidence})`,
      suggestedFollowUp:
        "I'd love to help you narrow things down a bit more. Could you share your preferred travel dates and group size so I can find the best advisor match?",
    }
  }

  if (input.intent !== 'ready_to_book') {
    return {
      accepted: false,
      reason: `Intent is '${input.intent}', not 'ready_to_book'`,
      suggestedFollowUp:
        "It sounds like you're still exploring options — that's great! What's the one thing you'd like to lock in first: dates, destinations, or budget?",
    }
  }

  if (input.userTurnCount < 3) {
    return {
      accepted: false,
      reason: `Only ${input.userTurnCount} user turns (minimum 3)`,
      suggestedFollowUp:
        'Before connecting you with an advisor, let me gather a bit more context. What are your must-have experiences for this trip?',
    }
  }

  return { accepted: true, reason: 'All gates passed' }
}
