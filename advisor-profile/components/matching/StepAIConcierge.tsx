'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConciergeMessageBody from '@/components/matching/ConciergeMessageBody'
import type { AdvisorBrief } from '@/lib/advisorBrief'
import { persistAdvisorBrief } from '@/lib/advisorBrief'
import {
  getTextFromUIMessage,
  hasCompletedHandoffTool,
  messageHasAcceptedHandoff,
} from '@/lib/chatMessages'
import type { MatchIntakePayload } from '@/lib/matchAdvisors'
import {
  flushConciergeTurn,
  recordConciergeKeydown,
  recordConciergePaste,
  recordConciergeUserTurn,
} from '@/lib/telemetry/collector'
import IntentScoreDebugPanel from '@/components/dev/IntentScoreDebugPanel'

export const CHAT_MESSAGES_KEY = 'tbo_concierge_messages'

function readPersistedMessages(): UIMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(CHAT_MESSAGES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as UIMessage[]
  } catch {
    return []
  }
}

function persistMessages(messages: UIMessage[]) {
  try {
    if (messages.length === 0) return
    sessionStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages))
  } catch {
    /* ignore */
  }
}

function clearPersistedMessages() {
  try {
    sessionStorage.removeItem(CHAT_MESSAGES_KEY)
  } catch {
    /* ignore */
  }
}

const SUGGESTED_PROMPTS = [
  'Sketch a 10-day route that fits our pace',
  'What should we prioritize with this budget?',
  'We are ready to talk to a human advisor',
] as const

type Props = {
  intake: MatchIntakePayload
  onHandoff: (brief: AdvisorBrief) => void
  onBack?: () => void
  onTransferStarted?: () => void
}

type Phase = 'chat' | 'transferring'

function StepDots() {
  return (
    <motion.div
      className="mb-4 flex justify-center gap-2"
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

function ConciergeAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm`}
      style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
      aria-hidden
    >
      TC
    </div>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L17 12l-10.8 1.4-2.8 7.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <ConciergeAvatar size="sm" />
      <div
        className="flex gap-1.5 rounded-2xl rounded-bl-md border px-4 py-3 shadow-sm"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--teal)]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--teal)] opacity-60 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--teal)] opacity-30 [animation-delay:300ms]" />
      </div>
    </div>
  )
}

function TripPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}
    >
      {children}
    </span>
  )
}

const MIN_USER_TURNS_FOR_HANDOFF = 3

export default function StepAIConcierge({ intake, onHandoff, onBack, onTransferStarted }: Props) {
  const [phase, setPhase] = useState<Phase>('chat')
  const [input, setInput] = useState('')
  const [transferError, setTransferError] = useState<string | null>(null)

  const [intakeBlocked, setIntakeBlocked] = useState(false)
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)
  const [handoffBlockedMsg, setHandoffBlockedMsg] = useState<string | null>(null)
  const handoffStarted = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialMessages = useRef<UIMessage[]>(readPersistedMessages())
  const wasRestored = initialMessages.current.length > 0

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { intake },
        fetch: async (input, init) => {
          setRateLimitError(null)
          const res = await fetch(input, init)
          if (res.headers.get('X-Intake-Blocked') === 'true') {
            setIntakeBlocked(true)
          }
          return res
        },
      }),
    [intake],
  )

  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    transport,
    onFinish: ({ messages: finishedMessages }) => {
      if (hasCompletedHandoffTool(finishedMessages)) {
        void executeHandoff(finishedMessages)
      }
    },
    onError: async (chatError) => {
      const message = chatError.message ?? ''
      if (message.includes('429') || message.toLowerCase().includes('too many')) {
        setRateLimitError('You are sending messages too quickly. Please wait a moment and try again.')
      }
    },
  })

  // AI SDK v6's useChat doesn't reliably apply initialMessages to its internal
  // state (the transport-based architecture can reset it). Hydrate persisted
  // messages explicitly via setMessages on mount.
  useEffect(() => {
    if (initialMessages.current.length > 0) {
      setMessages(initialMessages.current)
    }
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist messages to sessionStorage on every update so they survive navigation
  useEffect(() => {
    persistMessages(messages)
  }, [messages])

  const isBusy = status === 'submitted' || status === 'streaming'
  const isTransferring = phase === 'transferring'
  const isEmpty = messages.length === 0

  const executeHandoff = useCallback(
    async (msgs: UIMessage[]) => {
      if (handoffStarted.current) return
      handoffStarted.current = true
      stop()
      setTransferError(null)



      setPhase('transferring')
      onTransferStarted?.()

      try {
        const res = await fetch('/api/synthesize-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs, intake }),
        })
        if (res.status === 422 || res.status === 429) {
          const body = (await res.json().catch(() => ({}))) as { message?: string }
          throw new Error(body.message ?? 'Trip details need updating before we can continue.')
        }
        if (!res.ok) throw new Error('Brief synthesis failed')
        const data = (await res.json()) as { brief: AdvisorBrief }
        persistAdvisorBrief(data.brief)
        // NOTE: do NOT clear persisted messages here — the parent page clears them
        // only after advisor matching fully succeeds (step 4). This allows the user
        // to see their previous conversation if a guardrail rejects the handoff and
        // sends them back to step 2.
        await new Promise((r) => setTimeout(r, 1400))
        onHandoff(data.brief)
      } catch (err) {
        setTransferError(
          err instanceof Error ? err.message : 'Could not prepare your brief. Please try again.',
        )
        handoffStarted.current = false
        setPhase('chat')
      }
    },
    [intake, onHandoff, onTransferStarted, stop],
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
  }, [messages, phase, isBusy])

  const handleSend = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isBusy || isTransferring) return
    setHandoffBlockedMsg(null)
    flushConciergeTurn()
    recordConciergeUserTurn()
    sendMessage({ text: trimmed })
    setInput('')
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
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
      className="flex min-h-0 h-full w-full flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(220px,17rem)_1fr] lg:items-stretch lg:gap-5 xl:grid-cols-[minmax(260px,20rem)_1fr] xl:gap-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <aside className="flex shrink-0 flex-col gap-3 lg:pt-1 lg:sticky lg:top-0 lg:self-start">
        <StepDots />
        {wasRestored && (
          <p
            className="rounded-lg border px-3 py-2 text-xs leading-relaxed"
            style={{
              borderColor: 'var(--teal)',
              background: 'var(--teal-light)',
              color: 'var(--teal)',
            }}
          >
            💬 Your previous conversation has been restored.
          </p>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="self-start text-sm transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            ← Back
          </button>
        )}
        <div>
          <p
            className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em]"
            style={{ color: 'var(--section-label)' }}
          >
            AI Concierge
          </p>
          <h2
            id="concierge-title"
            className="font-display text-[clamp(1.35rem,1.2rem+1vw,1.85rem)] italic tracking-[-0.02em]"
            style={{ color: 'var(--ink)' }}
          >
            Let&apos;s shape your {intake.destination} trip
          </h2>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <TripPill>₹{intake.budgetLakh}L</TripPill>
            <TripPill>{intake.travelStyle}</TripPill>
            <TripPill>{intake.vibe}</TripPill>
            <TripPill>{intake.pace}</TripPill>
          </div>
        </div>
      </aside>

      <motion.div
        className="flex min-h-0 min-w-0 flex-1 h-full flex-col overflow-hidden rounded-2xl border shadow-[0_4px_24px_rgba(28,25,23,0.08)]"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--border)',
        }}
        layout
      >
        {/* In-card header */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <ConciergeAvatar size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                TravelConnect Concierge
              </p>
              <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden
                />
                Online · knows your {intake.destination} brief
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              const userTurns = messages.filter((m) => m.role === 'user').length
              if (userTurns < MIN_USER_TURNS_FOR_HANDOFF) {
                setHandoffBlockedMsg(
                  `Share a bit more about your trip first (at least ${MIN_USER_TURNS_FOR_HANDOFF} messages). Tell us about your dates, interests, or must-see places!`,
                )
                return
              }
              setHandoffBlockedMsg(null)
              void executeHandoff(messages)
            }}
            className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-40"
            style={{
              borderColor: 'var(--teal)',
              color: 'var(--teal)',
              background: 'var(--teal-light)',
            }}
          >
            Connect to Advisor
          </button>
        </div>

        {/* Message area */}
        <div
          ref={scrollRef}
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 ${isEmpty ? 'flex flex-col justify-center' : ''}`}
          role="log"
          aria-live="polite"
          aria-label="Concierge conversation"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 8%, rgba(15,110,86,0.05) 0%, transparent 42%), radial-gradient(circle at 88% 92%, rgba(186,117,23,0.04) 0%, transparent 38%)',
          }}
        >
          <div className="flex w-full flex-col gap-4">
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full flex-col gap-6 md:gap-8 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="flex items-start gap-3 sm:gap-4 xl:max-w-sm xl:shrink-0">
                  <ConciergeAvatar />
                  <div className="min-w-0 pt-0.5">
                    <p className="text-base font-medium sm:text-lg" style={{ color: 'var(--ink)' }}>
                      Hi — I&apos;m your concierge for {intake.destination}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Tell me what you&apos;re imagining, or pick a suggestion to get started.
                    </p>
                  </div>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2 xl:min-w-0 xl:flex-1 xl:grid-cols-3">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <motion.button
                      key={prompt}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isBusy}
                      onClick={() => handleSend(prompt)}
                      className="rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[rgba(15,110,86,0.35)]"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--body)',
                      }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
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
                        className="max-w-[min(90%,34rem)] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm"
                        style={{
                          background: 'linear-gradient(135deg, var(--teal), #0a5a46)',
                        }}
                      >
                        <p className="whitespace-pre-wrap break-words">{text}</p>
                      </div>
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-end gap-2.5"
                  >
                    <ConciergeAvatar size="sm" />
                    <article
                      className="max-w-[min(90%,42rem)] rounded-2xl rounded-bl-md border px-4 py-3 shadow-sm"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--surface)',
                      }}
                    >
                      {text ? (
                        <ConciergeMessageBody text={text} />
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>
                          …
                        </span>
                      )}
                      {messageHasAcceptedHandoff(message) && (
                        <p className="mt-2.5 text-xs font-medium" style={{ color: 'var(--teal)' }}>
                          Connecting you with a human advisor…
                        </p>
                      )}
                    </article>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {isBusy && <TypingIndicator />}
          </div>
        </div>

        {(error || transferError || rateLimitError || handoffBlockedMsg) && (
          <p className="shrink-0 px-4 pb-1 text-center text-xs text-red-600 sm:px-5" role="alert">
            {handoffBlockedMsg ?? transferError ?? rateLimitError ?? error?.message}
          </p>
        )}

        {intakeBlocked && onBack && (
          <div className="shrink-0 px-4 pb-2 text-center sm:px-5">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90"
              style={{
                borderColor: 'var(--teal)',
                color: 'var(--teal)',
                background: 'var(--teal-light)',
              }}
            >
              Edit trip details
            </button>
          </div>
        )}

        {/* Input footer */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t px-4 py-3 sm:px-6 lg:px-8"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div
            className="flex items-end gap-2 rounded-2xl border p-2 shadow-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <label htmlFor="concierge-input" className="sr-only">
              Message the concierge
            </label>
            <textarea
              ref={inputRef}
              id="concierge-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                recordConciergeKeydown()
                handleInputKeyDown(e)
              }}
              onPaste={() => recordConciergePaste()}
              disabled={isBusy}
              placeholder="Ask about routes, vibe, budget fit…"
              className="max-h-32 min-h-[2.5rem] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none"
              style={{ color: 'var(--ink)' }}
            />
            <motion.button
              type="submit"
              disabled={isBusy || !input.trim()}
              whileTap={{ scale: 0.94 }}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"
              style={{ background: 'var(--teal)' }}
            >
              <SendIcon />
            </motion.button>
          </div>
          <p className="mt-2 text-center text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            Shift+Enter for a new line · we&apos;ll summarize this chat for your matched expert on handoff
          </p>
        </form>
      </motion.div>

      {/* Debug overlay — only visible in dev or with ?debug=1 in the URL */}
      <IntentScoreDebugPanel
        userTurns={messages.filter((m) => m.role === 'user').length}
      />
    </motion.div>
  )
}
