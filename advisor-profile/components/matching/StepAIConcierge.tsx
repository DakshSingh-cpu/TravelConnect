'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConciergeMessageBody from '@/components/matching/ConciergeMessageBody'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { persistAdvisorBrief } from '@/lib/advisorBrief'
import { getTextFromUIMessage, hasCompletedHandoffTool } from '@/lib/chatMessages'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'

const SUGGESTED_PROMPTS = [
  'Sketch a 10-day route that fits our pace',
  'What should we prioritize with this budget?',
  'We are ready to talk to a human advisor',
] as const

type Props = {
  intake: MatchIntakePayload
  onHandoff: (brief: AdvisorBrief) => void
  onBack?: () => void
}

type Phase = 'chat' | 'transferring'

function StepDots() {
  return (
    <motion.div
      className="mb-5 flex justify-center gap-2"
      aria-hidden="true"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-[7px] w-[7px] rounded-full transition-all duration-200 ease-out ${
            i < 3 ? 'scale-125' : ''
          }`}
          style={{
            backgroundColor: i < 3 ? 'var(--teal)' : 'var(--border)',
          }}
        />
      ))}
    </motion.div>
  )
}

export default function StepAIConcierge({ intake, onHandoff, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('chat')
  const [input, setInput] = useState('')
  const [transferError, setTransferError] = useState<string | null>(null)
  const handoffStarted = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { intake },
      }),
    [intake],
  )

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    onFinish: ({ messages: finishedMessages }) => {
      if (hasCompletedHandoffTool(finishedMessages)) {
        void executeHandoff(finishedMessages)
      }
    },
  })

  const isBusy = status === 'submitted' || status === 'streaming'
  const isTransferring = phase === 'transferring'

  const executeHandoff = useCallback(
    async (msgs: UIMessage[]) => {
      if (handoffStarted.current) return
      handoffStarted.current = true
      stop()
      setTransferError(null)
      setPhase('transferring')

      try {
        const res = await fetch('/api/synthesize-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs, intake }),
        })
        if (!res.ok) throw new Error('Brief synthesis failed')
        const data = (await res.json()) as { brief: AdvisorBrief }
        persistAdvisorBrief(data.brief)
        await new Promise((r) => setTimeout(r, 1400))
        onHandoff(data.brief)
      } catch {
        setTransferError('Could not prepare your brief. Please try again.')
        handoffStarted.current = false
        setPhase('chat')
      }
    },
    [intake, onHandoff, stop],
  )

  useEffect(() => {
    if (phase !== 'chat' || handoffStarted.current) return
    if (hasCompletedHandoffTool(messages)) {
      void executeHandoff(messages)
    }
  }, [messages, phase, executeHandoff])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, phase])

  const handleSend = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isBusy || isTransferring) return
    sendMessage({ text: trimmed })
    setInput('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  if (isTransferring) {
    return (
      <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <StepDots />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg rounded-2xl border p-10 text-center shadow-[0_8px_36px_rgba(28,25,23,0.10)] backdrop-blur-md"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <motion.div
            className="mx-auto mb-6 h-12 w-12 rounded-full border-[3px] border-[var(--teal-light)] border-t-[var(--teal)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <h2 className="font-display text-xl italic tracking-tight" style={{ color: 'var(--ink)' }}>
            Transferring to your expert…
          </h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            Packaging your preferences and conversation into a brief for your matched advisor.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      className="flex min-h-0 w-full flex-1 flex-col"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <StepDots />

      <div className="mb-5 flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 text-sm text-stone-400 transition-colors hover:text-[#0F6E56]"
            >
              ← Back
            </button>
          )}
          <p
            className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em]"
            style={{ color: 'var(--section-label)' }}
          >
            AI Concierge
          </p>
          <h2
            id="concierge-title"
            className="font-display text-[clamp(1.35rem,1.2rem+1vw,2rem)] italic tracking-[-0.02em]"
            style={{ color: 'var(--ink)' }}
          >
            Let&apos;s shape your {intake.destination} trip
          </h2>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>
            ₹{intake.budgetLakh}L · {intake.travelStyle} · {intake.vibe} · {intake.pace}
          </p>
        </div>
      </div>

      <motion.div
        className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border shadow-[0_4px_24px_rgba(28,25,23,0.08)] backdrop-blur-md"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--border)',
          minHeight: 'min(640px, calc(100dvh - 11rem))',
        }}
        layout
      >
        <motion.div
          ref={scrollRef}
          className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6 lg:px-10"
          role="log"
          aria-live="polite"
          aria-label="Concierge conversation"
        >
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border px-5 py-4 text-sm leading-relaxed"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--body)',
              }}
            >
              Hi — I&apos;m your TravelConnect concierge for <strong>{intake.destination}</strong>. Tell me what
              you&apos;re imagining, or tap a suggestion below.
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const text = getTextFromUIMessage(message)
              const isUser = message.role === 'user'
              if (!text && message.role === 'user') return null

              if (isUser) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div
                      className="max-w-[min(100%,28rem)] rounded-2xl rounded-br-md px-5 py-3 text-sm leading-relaxed text-white shadow-sm"
                      style={{
                        background: 'linear-gradient(135deg, var(--teal), #0a5a46)',
                      }}
                    >
                      {text}
                    </div>
                  </motion.div>
                )
              }

              return (
                <motion.article
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full rounded-xl border-l-[3px] px-5 py-4 sm:px-6"
                  style={{
                    borderColor: 'var(--border)',
                    borderLeftColor: 'var(--teal)',
                    background: 'var(--surface)',
                  }}
                >
                  <p
                    className="mb-2 text-[0.625rem] font-bold uppercase tracking-[0.1em]"
                    style={{ color: 'var(--teal)' }}
                  >
                    Concierge
                  </p>
                  {text ? (
                    <ConciergeMessageBody text={text} />
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      …
                    </span>
                  )}
                  {message.parts.some((p) => p.type === 'tool-initiate_human_handoff') && (
                    <p className="mt-3 text-xs font-medium" style={{ color: 'var(--teal)' }}>
                      Connecting you with a human advisor…
                    </p>
                  )}
                </motion.article>
              )
            })}
          </AnimatePresence>

          {isBusy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              <div
                className="flex gap-1.5 rounded-xl border px-5 py-4"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--teal)]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--teal)] opacity-60 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--teal)] opacity-30 [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}
        </motion.div>

        {messages.length === 0 && (
          <div
            className="flex flex-wrap gap-2 border-t px-4 py-3 sm:px-8 lg:px-10"
            style={{ borderColor: 'var(--border)' }}
          >
            {SUGGESTED_PROMPTS.map((prompt) => (
              <motion.button
                key={prompt}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={isBusy}
                onClick={() => handleSend(prompt)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-[rgba(15,110,86,0.35)]"
                style={{ borderColor: 'var(--border)', color: 'var(--body)' }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        )}

        {(error || transferError) && (
          <p className="px-4 pb-2 text-center text-xs text-red-600 sm:px-8">
            {transferError ?? error?.message}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 flex-col gap-3 border-t px-4 py-4 sm:px-8 sm:py-5 lg:px-10"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex w-full gap-3">
            <label htmlFor="concierge-input" className="sr-only">
              Message the concierge
            </label>
            <input
              id="concierge-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isBusy}
              placeholder="Ask about routes, vibe, budget fit…"
              className="min-w-0 flex-1 rounded-xl border px-4 py-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[rgba(15,110,86,0.25)]"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
              }}
            />
            <motion.button
              type="submit"
              disabled={isBusy || !input.trim()}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 rounded-xl px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--teal)' }}
            >
              Send
            </motion.button>
          </div>

          <motion.button
            type="button"
            disabled={isBusy}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => void executeHandoff(messages)}
            className="w-full rounded-xl border-2 py-3.5 text-sm font-semibold shadow-sm transition-colors"
            style={{
              borderColor: 'var(--teal)',
              color: 'var(--teal)',
              background: 'var(--teal-light)',
            }}
          >
            Connect to Advisor →
          </motion.button>
          <p className="text-center text-[11px]" style={{ color: 'var(--muted)' }}>
            Explicit handoff — we&apos;ll summarize this chat for your matched expert.
          </p>
        </form>
      </motion.div>
    </motion.div>
  )
}
