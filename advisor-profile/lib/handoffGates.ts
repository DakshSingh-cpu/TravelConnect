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
        'Continue the conversation naturally. Do NOT repeat or re-ask for information the user has already provided. Review what has been shared so far and identify the single most important missing detail (e.g. group size, specific activities, or budget) — then ask only about that one thing in a friendly, conversational way.',
    }
  }

  if (input.intent !== 'ready_to_book') {
    return {
      accepted: false,
      reason: `Intent is '${input.intent}', not 'ready_to_book'`,
      suggestedFollowUp:
        "Continue the conversation naturally. The user is still exploring — ask them one specific helpful question to move things forward. Do not repeat anything they have already told you.",
    }
  }

  if (input.userTurnCount < 3) {
    return {
      accepted: false,
      reason: `Only ${input.userTurnCount} user turns (minimum 3)`,
      suggestedFollowUp:
        "Continue the conversation naturally. Ask the user about one must-have experience for their trip that hasn't been discussed yet — without repeating anything already shared.",
    }
  }

  return { accepted: true, reason: 'All gates passed' }
}
