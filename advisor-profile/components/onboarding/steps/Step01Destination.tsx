'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { staggerContainerVariants, staggerItemVariants, chipHover, chipTap, chipSpring } from '@/lib/motion/onboardingVariants'
import { SURPRISE_ME_POOL } from '@/lib/guardrails/constants'
import AnimatedCheckmark from '@/components/onboarding/inputs/AnimatedCheckmark'

// ── Destination region options ────────────────────────────────────────────────

const DESTINATIONS = [
  {
    id: 'Europe',
    label: 'Europe',
    hint: 'Culture & grand routes',
    emoji: '🏛️',
  },
  {
    id: 'Southeast Asia',
    label: 'Southeast Asia',
    hint: 'Temples & islands',
    emoji: '🌏',
  },
  {
    id: 'Japan',
    label: 'Japan',
    hint: 'Design & precision',
    emoji: '⛩️',
  },
  {
    id: 'Maldives',
    label: 'Maldives',
    hint: 'Overwater calm',
    emoji: '🏝️',
  },
  {
    id: 'Africa Safari',
    label: 'Africa Safari',
    hint: 'Wildlife & lodges',
    emoji: '🦁',
  },
  {
    id: 'Surprise me',
    label: 'Surprise me',
    hint: 'Let us choose',
    emoji: '✨',
  },
] as const

// ── Autocomplete ──────────────────────────────────────────────────────────────

interface Suggestion {
  label: string
  category: 'Region' | 'Country' | 'City' | 'Special'
  emoji: string
  id: string
}

const POPULAR_SEARCH: Suggestion[] = [
  { id: 'europe', label: 'Europe', category: 'Region', emoji: '🌍' },
  { id: 'japan', label: 'Japan', category: 'Country', emoji: '🇯🇵' },
  { id: 'maldives', label: 'Maldives', category: 'Country', emoji: '🏝️' },
  { id: 'bali', label: 'Bali', category: 'City', emoji: '🌴' },
  { id: 'southeast-asia', label: 'Southeast Asia', category: 'Region', emoji: '🌏' },
  { id: 'dubai', label: 'Dubai', category: 'City', emoji: '🏙️' },
  { id: 'surprise-me', label: 'Surprise me', category: 'Special', emoji: '✨' },
]

const DEBOUNCE_MS = 300

async function fetchDestinations(q: string, signal: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch(`/api/destinations?q=${encodeURIComponent(q)}`, { signal })
  if (!res.ok) return []
  const data: unknown = await res.json()
  return Array.isArray(data) ? (data as Suggestion[]) : []
}

function pickRandomSurprise(): string {
  return SURPRISE_ME_POOL[Math.floor(Math.random() * SURPRISE_ME_POOL.length)]
}

function isSurprise(v: string) {
  return v.trim().toLowerCase() === 'surprise me'
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  value: string
  onChange: (destination: string) => void
  onHoverChange?: (id: string | null) => void
}

export default function Step01Destination({ value, onChange, onHoverChange }: Props) {
  const reduceMotion = useReducedMotion()
  const [gridSelected, setGridSelected] = useState<string | null>(null)
  const [query, setQuery] = useState(value && !DESTINATIONS.find((d) => d.id === value) ? value : '')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiFailed, setApiFailed] = useState(false)
  const [fetchedFor, setFetchedFor] = useState<string | null>(null)
  const [surpriseResult, setSurpriseResult] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const trimmed = query.trim()
  const useDbSearch = trimmed.length > 0

  const suggestions: Suggestion[] = (() => {
    if (!useDbSearch) return POPULAR_SEARCH
    if (isLoading && fetchedFor !== trimmed) return []
    return apiSuggestions
  })()

  // Fetch autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (!useDbSearch) {
      setIsLoading(false)
      setApiSuggestions([])
      setApiFailed(false)
      setFetchedFor(null)
      return
    }

    setIsLoading(true)
    setApiFailed(false)
    setApiSuggestions([])
    setFetchedFor(null)

    debounceRef.current = setTimeout(() => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      void fetchDestinations(trimmed, ctrl.signal)
        .then((results) => {
          if (ctrl.signal.aborted) return
          setApiSuggestions(results)
          setApiFailed(false)
          setFetchedFor(trimmed)
        })
        .catch(() => {
          if (ctrl.signal.aborted) return
          setApiSuggestions([])
          setApiFailed(true)
          setFetchedFor(trimmed)
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setIsLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [trimmed, useDbSearch])

  // Click outside to close
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx + 1] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx])

  useEffect(() => {
    setActiveIdx(-1)
  }, [suggestions.length, isLoading, trimmed])

  const handleSurprise = useCallback(() => {
    const picked = pickRandomSurprise()
    setSurpriseResult(picked)
    setGridSelected(picked)
    setQuery('')
    setIsOpen(false)
    setActiveIdx(-1)
    onChange(picked)
  }, [onChange])

  const selectFromDropdown = useCallback(
    (dest: Suggestion) => {
      if (isSurprise(dest.label)) {
        handleSurprise()
        return
      }
      setQuery(dest.label)
      setGridSelected(null)
      setIsOpen(false)
      setActiveIdx(-1)
      onChange(dest.label)
    },
    [handleSurprise, onChange],
  )

  const selectFromGrid = useCallback(
    (id: string) => {
      if (isSurprise(id)) {
        handleSurprise()
        return
      }
      setSurpriseResult(null)
      setGridSelected(id)
      setQuery('')
      setIsOpen(false)
      setApiSuggestions([])
      setApiFailed(false)
      setFetchedFor(null)
      onChange(id)
    },
    [handleSurprise, onChange],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setGridSelected(null)
    setActiveIdx(-1)
    setIsOpen(true)
    // Call onChange on every keystroke so the wizard nav enables when ≥3 chars
    if (val.trim().length >= 3) onChange(val.trim())
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const count = suggestions.length

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true)
        return
      }

      if (isLoading && count === 0) {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (trimmed) { onChange(trimmed); setIsOpen(false) }
        } else if (e.key === 'Escape') {
          setIsOpen(false); setActiveIdx(-1)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (count > 0) setActiveIdx((i) => (i + 1) % count)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (count > 0) setActiveIdx((i) => (i <= 0 ? count - 1 : i - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (activeIdx >= 0 && suggestions[activeIdx]) {
            selectFromDropdown(suggestions[activeIdx])
          } else if (trimmed) {
            onChange(trimmed); setIsOpen(false)
          }
          break
        case 'Escape':
          setIsOpen(false); setActiveIdx(-1)
          break
      }
    },
    [isOpen, suggestions, activeIdx, trimmed, isLoading, onChange, selectFromDropdown],
  )

  const showLoadingRow = useDbSearch && isLoading
  const showEmptyHint =
    useDbSearch && !isLoading && fetchedFor === trimmed && suggestions.length === 0
  const showDropdown =
    isOpen && (suggestions.length > 0 || showLoadingRow || showEmptyHint || apiFailed)

  const dropdownLabel = (() => {
    if (!useDbSearch) return 'Popular destinations'
    if (showLoadingRow) return 'Searching…'
    if (apiFailed) return 'Search unavailable'
    if (showEmptyHint) return 'No locations found'
    return `${suggestions.length} result${suggestions.length !== 1 ? 's' : ''}`
  })()

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-5"
    >
      <motion.div variants={staggerItemVariants}>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ink, #1c1917)' }}>
          Where do you want to go?
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted, #78716c)' }}>
          Choose a region — or search for a city, country, or island.
        </p>
      </motion.div>

      {/* Destination region chips */}
      <motion.div
        variants={staggerItemVariants}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Destination region"
      >
        {DESTINATIONS.map((d) => {
          const isSel = gridSelected === d.id || value === d.id
          return (
            <motion.button
              key={d.id}
              type="button"
              aria-pressed={isSel}
              aria-label={`${d.label}: ${d.hint}`}
              onClick={() => selectFromGrid(d.id)}
              onMouseEnter={() => onHoverChange?.(d.id)}
              onMouseLeave={() => onHoverChange?.(null)}
              onFocus={() => onHoverChange?.(d.id)}
              onBlur={() => onHoverChange?.(null)}
              whileHover={reduceMotion ? undefined : chipHover}
              whileTap={reduceMotion ? undefined : chipTap}
              transition={reduceMotion ? { duration: 0 } : chipSpring}
              className="flex min-h-[5.5rem] flex-col items-start justify-between rounded-2xl border p-4 text-left shadow-[0_1px_4px_rgba(28,25,23,0.05)] transition-colors duration-150"
              style={{
                borderColor: isSel
                  ? 'var(--teal, #0F6E56)'
                  : 'var(--border, rgba(28,25,23,0.09))',
                backgroundColor: isSel
                  ? 'var(--teal-light, #E8F5EF)'
                  : 'var(--surface, #fff)',
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-2xl leading-none" aria-hidden>
                  {d.emoji}
                </span>
                <AnimatedCheckmark visible={isSel} className="mt-0.5 shrink-0" />
              </div>
              <div>
                <div
                  className="text-sm font-semibold leading-snug"
                  style={{
                    color: isSel ? 'var(--teal, #0F6E56)' : 'var(--ink, #1c1917)',
                  }}
                >
                  {d.label}
                </div>
                <div
                  className="mt-0.5 text-[0.6875rem] leading-snug"
                  style={{ color: 'var(--muted, #78716c)' }}
                >
                  {d.hint}
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Divider */}
      <motion.div variants={staggerItemVariants} className="flex items-center gap-3">
        <div className="grow border-t" style={{ borderColor: 'var(--border, rgba(28,25,23,0.09))' }} />
        <span
          className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          or search by city or country
        </span>
        <div className="grow border-t" style={{ borderColor: 'var(--border, rgba(28,25,23,0.09))' }} />
      </motion.div>

      {/* Search input with autocomplete */}
      <motion.div variants={staggerItemVariants} ref={containerRef} className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[1rem] leading-none"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          id="wizard-destination-search"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="wizard-dest-listbox"
          aria-busy={showLoadingRow}
          aria-activedescendant={activeIdx >= 0 ? `wizard-dest-opt-${activeIdx}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. Italy, Paris, Bali, New York…"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border py-3 pl-10 pr-8 text-sm outline-none transition-all duration-200"
          style={{
            background: 'var(--surface, #fff)',
            borderColor: isOpen ? 'var(--teal, #0F6E56)' : 'var(--border, rgba(28,25,23,0.09))',
            boxShadow: isOpen
              ? '0 0 0 3px rgba(15,110,86,0.12)'
              : '0 1px 4px rgba(28,25,23,0.05)',
            color: 'var(--ink, #1c1917)',
          }}
        />

        {query.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setApiSuggestions([])
              setApiFailed(false)
              setFetchedFor(null)
              setIsOpen(true)
              inputRef.current?.focus()
              // Don't clear destination — keep grid selection if any
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-xs transition-colors hover:bg-black/5"
            style={{ color: 'var(--muted, #78716c)' }}
          >
            ✕
          </button>
        )}

        {showDropdown && (
          <ul
            ref={listRef}
            id="wizard-dest-listbox"
            role="listbox"
            aria-label="Destination suggestions"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-xl border py-1"
            style={{
              background: 'var(--surface, #fff)',
              borderColor: 'var(--border, rgba(28,25,23,0.09))',
              boxShadow: '0 8px 32px rgba(28,25,23,0.12), 0 2px 8px rgba(28,25,23,0.06)',
            }}
          >
            <li
              className="px-3 pb-1 pt-2 text-[0.625rem] font-semibold uppercase tracking-[0.08em]"
              aria-hidden
              style={{ color: 'var(--muted, #78716c)' }}
            >
              {dropdownLabel}
            </li>

            {showLoadingRow && (
              <li className="mx-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ color: 'var(--muted, #78716c)' }}>
                <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--teal)] opacity-40" />
                Loading…
              </li>
            )}

            {(showEmptyHint || apiFailed) && !showLoadingRow && (
              <li className="mx-1 rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ color: 'var(--muted, #78716c)' }}>
                {apiFailed
                  ? 'Could not load destinations. Press Enter to use your text.'
                  : 'No results found. Try another search or pick a region above.'}
              </li>
            )}

            {suggestions.map((dest, idx) => {
              const isActive = idx === activeIdx
              return (
                <li
                  key={dest.id}
                  id={`wizard-dest-opt-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => { e.preventDefault(); selectFromDropdown(dest) }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className="mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-100"
                  style={{
                    background: isActive ? 'rgba(15,110,86,0.09)' : 'transparent',
                    color: 'var(--ink, #1c1917)',
                  }}
                >
                  <span className="shrink-0 text-[1rem] leading-none">{dest.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{dest.label}</span>
                  <span
                    className="shrink-0 text-[0.5625rem] font-medium uppercase tracking-[0.06em]"
                    style={{ color: 'var(--muted, #78716c)' }}
                  >
                    {dest.category}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </motion.div>

      {/* Show selected destination confirmation */}
      {value && (
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs font-medium"
          style={{ color: 'var(--teal, #0F6E56)' }}
        >
          {surpriseResult && value === surpriseResult
            ? `✨ We picked: ${value}`
            : `✓ Selected: ${value}`}
        </motion.p>
      )}
    </motion.div>
  )
}
