import { describe, it, expect } from 'vitest'
import type { UIMessage } from 'ai'
import {
  checkLlmInputLimits,
  MAX_LLM_MESSAGES,
  MAX_LLM_TOTAL_INPUT_CHARS,
} from '@/lib/guardrails/llmInputLimits'

function msg(text: string): UIMessage {
  return { id: Math.random().toString(36), role: 'user', parts: [{ type: 'text', text }] }
}

describe('checkLlmInputLimits', () => {
  it('accepts a normal conversation', () => {
    const messages = [msg('hello'), msg('I want to go to Japan in March')]
    expect(checkLlmInputLimits(messages).ok).toBe(true)
  })

  it('rejects too many messages', () => {
    const messages = Array.from({ length: MAX_LLM_MESSAGES + 1 }, () => msg('hi'))
    const result = checkLlmInputLimits(messages)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INPUT_TOO_LARGE')
  })

  it('rejects an oversized total payload', () => {
    const big = 'x'.repeat(MAX_LLM_TOTAL_INPUT_CHARS + 1)
    const result = checkLlmInputLimits([msg(big)])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('INPUT_TOO_LARGE')
  })

  it('accepts an empty conversation', () => {
    expect(checkLlmInputLimits([]).ok).toBe(true)
  })
})
