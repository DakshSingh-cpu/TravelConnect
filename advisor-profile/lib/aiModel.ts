import { createGoogleGenerativeAI } from '@ai-sdk/google'

/**
 * Free-tier Gemini models to rotate through when rate-limited.
 * Order: primary model first, then fallbacks.
 */
const FREE_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
] as const

export const CONCIERGE_MODEL_ID =
  process.env.GEMINI_CONCIERGE_MODEL ?? FREE_GEMINI_MODELS[0]

export function getGeminiApiKey(): string | undefined {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || undefined
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey())
}

export function getConciergeModel(modelId?: string) {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set')
  }
  return createGoogleGenerativeAI({ apiKey })(modelId ?? CONCIERGE_MODEL_ID)
}

/**
 * Returns the ordered list of models to try.
 * Primary model first, then remaining free models as fallbacks.
 */
export function getModelRotation(): string[] {
  const primary = CONCIERGE_MODEL_ID
  const others = FREE_GEMINI_MODELS.filter((m) => m !== primary)
  return [primary, ...others]
}
