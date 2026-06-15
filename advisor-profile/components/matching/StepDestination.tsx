'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SURPRISE_ME_POOL } from '@/lib/guardrails/constants'

// ── Curated Grid Destinations ────────────────────────────────────────────────

const DESTINATIONS = [
  {
    id: 'Europe',
    label: 'Europe',
    hint: 'Culture & grand routes',
    image:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'Southeast Asia',
    label: 'Southeast Asia',
    hint: 'Temples & islands',
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'Japan',
    label: 'Japan',
    hint: 'Design & precision',
    image:
      'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'Maldives',
    label: 'Maldives',
    hint: 'Overwater calm',
    image:
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'Africa Safari',
    label: 'Africa Safari',
    hint: 'Wildlife & lodges',
    image:
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'Surprise me',
    label: 'Surprise me',
    hint: 'Let us choose',
    image:
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80',
  },
] as const

// ── Autocomplete Suggestion Dataset ─────────────────────────────────────────

interface Suggestion {
  label: string
  category: 'Region' | 'Country' | 'City' | 'Special'
  emoji: string
  id: string
}

const ALL_SUGGESTIONS: Suggestion[] = [
  // Regions
  { id: 'region-europe', label: 'Europe', category: 'Region', emoji: '🌍' },
  { id: 'region-western-europe', label: 'Western Europe', category: 'Region', emoji: '🌍' },
  { id: 'region-southeast-asia', label: 'Southeast Asia', category: 'Region', emoji: '🌏' },
  { id: 'region-east-asia', label: 'East Asia', category: 'Region', emoji: '🌏' },
  { id: 'region-middle-east', label: 'Middle East', category: 'Region', emoji: '🌍' },
  { id: 'region-south-asia', label: 'South Asia', category: 'Region', emoji: '🌏' },
  { id: 'region-north-america', label: 'North America', category: 'Region', emoji: '🌎' },
  { id: 'region-south-america', label: 'South America', category: 'Region', emoji: '🌎' },
  { id: 'region-africa', label: 'Africa', category: 'Region', emoji: '🌍' },
  { id: 'region-africa-safari', label: 'Africa Safari', category: 'Region', emoji: '🦁' },
  { id: 'region-oceania', label: 'Oceania', category: 'Region', emoji: '🌏' },
  { id: 'region-scandinavia', label: 'Scandinavia', category: 'Region', emoji: '🌍' },
  { id: 'region-mediterranean', label: 'Mediterranean', category: 'Region', emoji: '🌊' },
  { id: 'region-alps', label: 'Alps', category: 'Region', emoji: '🏔️' },
  // Countries
  { id: 'country-france', label: 'France', category: 'Country', emoji: '🇫🇷' },
  { id: 'country-italy', label: 'Italy', category: 'Country', emoji: '🇮🇹' },
  { id: 'country-spain', label: 'Spain', category: 'Country', emoji: '🇪🇸' },
  { id: 'country-germany', label: 'Germany', category: 'Country', emoji: '🇩🇪' },
  { id: 'country-uk', label: 'UK', category: 'Country', emoji: '🇬🇧' },
  { id: 'country-united-kingdom', label: 'United Kingdom', category: 'Country', emoji: '🇬🇧' },
  { id: 'country-netherlands', label: 'Netherlands', category: 'Country', emoji: '🇳🇱' },
  { id: 'country-belgium', label: 'Belgium', category: 'Country', emoji: '🇧🇪' },
  { id: 'country-switzerland', label: 'Switzerland', category: 'Country', emoji: '🇨🇭' },
  { id: 'country-austria', label: 'Austria', category: 'Country', emoji: '🇦🇹' },
  { id: 'country-czech-republic', label: 'Czech Republic', category: 'Country', emoji: '🇨🇿' },
  { id: 'country-hungary', label: 'Hungary', category: 'Country', emoji: '🇭🇺' },
  { id: 'country-poland', label: 'Poland', category: 'Country', emoji: '🇵🇱' },
  { id: 'country-denmark', label: 'Denmark', category: 'Country', emoji: '🇩🇰' },
  { id: 'country-sweden', label: 'Sweden', category: 'Country', emoji: '🇸🇪' },
  { id: 'country-finland', label: 'Finland', category: 'Country', emoji: '🇫🇮' },
  { id: 'country-portugal', label: 'Portugal', category: 'Country', emoji: '🇵🇹' },
  { id: 'country-greece', label: 'Greece', category: 'Country', emoji: '🇬🇷' },
  { id: 'country-ireland', label: 'Ireland', category: 'Country', emoji: '🇮🇪' },
  { id: 'country-russia', label: 'Russia', category: 'Country', emoji: '🇷🇺' },
  { id: 'country-thailand', label: 'Thailand', category: 'Country', emoji: '🇹🇭' },
  { id: 'country-malaysia', label: 'Malaysia', category: 'Country', emoji: '🇲🇾' },
  { id: 'country-indonesia', label: 'Indonesia', category: 'Country', emoji: '🇮🇩' },
  { id: 'country-bali', label: 'Bali', category: 'Country', emoji: '🌴' },
  { id: 'country-singapore', label: 'Singapore', category: 'Country', emoji: '🇸🇬' },
  { id: 'country-philippines', label: 'Philippines', category: 'Country', emoji: '🇵🇭' },
  { id: 'country-vietnam', label: 'Vietnam', category: 'Country', emoji: '🇻🇳' },
  { id: 'country-japan', label: 'Japan', category: 'Country', emoji: '🇯🇵' },
  { id: 'country-south-korea', label: 'South Korea', category: 'Country', emoji: '🇰🇷' },
  { id: 'country-china', label: 'China', category: 'Country', emoji: '🇨🇳' },
  { id: 'country-taiwan', label: 'Taiwan', category: 'Country', emoji: '🇹🇼' },
  { id: 'country-hong-kong', label: 'Hong Kong', category: 'Country', emoji: '🇭🇰' },
  { id: 'country-uae', label: 'UAE', category: 'Country', emoji: '🇦🇪' },
  { id: 'country-qatar', label: 'Qatar', category: 'Country', emoji: '🇶🇦' },
  { id: 'country-oman', label: 'Oman', category: 'Country', emoji: '🇴🇲' },
  { id: 'country-turkey', label: 'Turkey', category: 'Country', emoji: '🇹🇷' },
  { id: 'country-egypt', label: 'Egypt', category: 'Country', emoji: '🇪🇬' },
  { id: 'country-india', label: 'India', category: 'Country', emoji: '🇮🇳' },
  { id: 'country-sri-lanka', label: 'Sri Lanka', category: 'Country', emoji: '🇱🇰' },
  { id: 'country-nepal', label: 'Nepal', category: 'Country', emoji: '🇳🇵' },
  { id: 'country-maldives', label: 'Maldives', category: 'Country', emoji: '🏝️' },
  { id: 'country-usa', label: 'USA', category: 'Country', emoji: '🇺🇸' },
  { id: 'country-canada', label: 'Canada', category: 'Country', emoji: '🇨🇦' },
  { id: 'country-brazil', label: 'Brazil', category: 'Country', emoji: '🇧🇷' },
  { id: 'country-kenya', label: 'Kenya', category: 'Country', emoji: '🇰🇪' },
  { id: 'country-south-africa', label: 'South Africa', category: 'Country', emoji: '🇿🇦' },
  { id: 'country-australia', label: 'Australia', category: 'Country', emoji: '🇦🇺' },
  // Cities
  { id: 'city-paris', label: 'Paris', category: 'City', emoji: '🗼' },
  { id: 'city-rome', label: 'Rome', category: 'City', emoji: '🏛️' },
  { id: 'city-barcelona', label: 'Barcelona', category: 'City', emoji: '🌆' },
  { id: 'city-amsterdam', label: 'Amsterdam', category: 'City', emoji: '🚲' },
  { id: 'city-prague', label: 'Prague', category: 'City', emoji: '🏰' },
  { id: 'city-vienna', label: 'Vienna', category: 'City', emoji: '🎶' },
  { id: 'city-zurich', label: 'Zurich', category: 'City', emoji: '⛰️' },
  { id: 'city-lisbon', label: 'Lisbon', category: 'City', emoji: '🌊' },
  { id: 'city-athens', label: 'Athens', category: 'City', emoji: '🏺' },
  { id: 'city-istanbul', label: 'Istanbul', category: 'City', emoji: '🕌' },
  { id: 'city-tokyo', label: 'Tokyo', category: 'City', emoji: '🗾' },
  { id: 'city-kyoto', label: 'Kyoto', category: 'City', emoji: '⛩️' },
  { id: 'city-bangkok', label: 'Bangkok', category: 'City', emoji: '🌃' },
  { id: 'city-sydney', label: 'Sydney', category: 'City', emoji: '🦘' },
  { id: 'city-new-york', label: 'New York', category: 'City', emoji: '🗽' },
  { id: 'city-dubai', label: 'Dubai', category: 'City', emoji: '🏙️' },
  // Special
  { id: 'special-surprise-me', label: 'Surprise me', category: 'Special', emoji: '✨' },
]

const POPULAR_SEARCH: Suggestion[] = ALL_SUGGESTIONS.filter((d) =>
  ['Europe', 'Japan', 'Maldives', 'Southeast Asia', 'Bali', 'Dubai', 'Surprise me'].includes(
    d.label,
  ),
)

const DEBOUNCE_MS = 300

// ── Helpers ──────────────────────────────────────────────────────────────────

function destinationSlug(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '-')
}

async function fetchDestinations(
  searchQuery: string,
  signal: AbortSignal,
): Promise<Suggestion[]> {
  const url = `/api/destinations?q=${encodeURIComponent(searchQuery)}`
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`Destinations API HTTP ${res.status}`)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) return []
  return data as Suggestion[]
}

// ── Sub-components ───────────────────────────────────────────────────────────

type Props = {
  onNext: (destination: string) => void
}

function StepDots({ filled }: { filled: number }) {
  return (
    <div className="mb-8 flex justify-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-[7px] w-[7px] rounded-full transition-all duration-200 ease-out ${
            i < filled ? 'scale-125' : ''
          }`}
          style={{
            backgroundColor: i < filled ? 'var(--teal)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

function isSurpriseMeDestination(value: string): boolean {
  return value.trim().toLowerCase() === 'surprise me'
}

function pickRandomSurprise(): string {
  const idx = Math.floor(Math.random() * SURPRISE_ME_POOL.length)
  return SURPRISE_ME_POOL[idx]
}

export default function StepDestination({ onNext }: Props) {
  const [gridSelected, setGridSelected] = useState<string | null>(null)
  const [surpriseResult, setSurpriseResult] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [searchSelected, setSearchSelected] = useState<string | null>(null)

  const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([])
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)
  const [apiFetchFailed, setApiFetchFailed] = useState(false)
  const [apiFetchedForQuery, setApiFetchedForQuery] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const selected = gridSelected ?? searchSelected ?? null
  const trimmedQuery = query.trim()
  const useDbSearch = trimmedQuery.length > 0

  const suggestions: Suggestion[] = (() => {
    if (trimmedQuery.length === 0) return POPULAR_SEARCH
    if (isLoadingPlaces && apiFetchedForQuery !== trimmedQuery) return []
    return apiSuggestions
  })()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (!useDbSearch) {
      setIsLoadingPlaces(false)
      setApiSuggestions([])
      setApiFetchFailed(false)
      setApiFetchedForQuery(null)
      return
    }

    setIsLoadingPlaces(true)
    setApiFetchFailed(false)
    setApiSuggestions([])
    setApiFetchedForQuery(null)

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller

      void fetchDestinations(trimmedQuery, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return
          setApiSuggestions(results)
          setApiFetchFailed(false)
          setApiFetchedForQuery(trimmedQuery)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          console.warn('[StepDestination] destinations fetch failed:', err)
          setApiSuggestions([])
          setApiFetchFailed(true)
          setApiFetchedForQuery(trimmedQuery)
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingPlaces(false)
          }
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [trimmedQuery, useDbSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx + 1] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx])

  useEffect(() => {
    setActiveIdx(-1)
  }, [suggestions.length, isLoadingPlaces, trimmedQuery])

  const handleSurpriseMe = useCallback(() => {
    const picked = pickRandomSurprise()
    setSurpriseResult(picked)
    setGridSelected(picked)
    setSearchSelected(null)
    setQuery('')
    setIsOpen(false)
    setActiveIdx(-1)
  }, [])

  const selectFromDropdown = useCallback((dest: Suggestion) => {
    if (isSurpriseMeDestination(dest.label)) {
      handleSurpriseMe()
      return
    }
    setQuery(dest.label)
    setSearchSelected(dest.label)
    setGridSelected(null)
    setIsOpen(false)
    setActiveIdx(-1)
  }, [handleSurpriseMe])

  const selectFromGrid = (id: string) => {
    if (isSurpriseMeDestination(id)) {
      handleSurpriseMe()
      return
    }
    setSurpriseResult(null)
    setGridSelected(id)
    setSearchSelected(null)
    setQuery('')
    setIsOpen(false)
    setApiSuggestions([])
    setApiFetchFailed(false)
    setApiFetchedForQuery(null)
  }

  const submitFreeText = useCallback(() => {
    if (!trimmedQuery) return
    setSearchSelected(trimmedQuery)
    setGridSelected(null)
    setIsOpen(false)
    setActiveIdx(-1)
  }, [trimmedQuery])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const navigableCount = suggestions.length

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true)
        return
      }

      if (isLoadingPlaces && navigableCount === 0) {
        if (e.key === 'Enter') {
          e.preventDefault()
          submitFreeText()
        } else if (e.key === 'Escape') {
          setIsOpen(false)
          setActiveIdx(-1)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (navigableCount === 0) break
          setActiveIdx((i) => (i + 1) % navigableCount)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (navigableCount === 0) break
          setActiveIdx((i) => (i <= 0 ? navigableCount - 1 : i - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (activeIdx >= 0 && suggestions[activeIdx]) {
            selectFromDropdown(suggestions[activeIdx])
          } else if (trimmedQuery) {
            submitFreeText()
          }
          break
        case 'Escape':
          setIsOpen(false)
          setActiveIdx(-1)
          break
      }
    },
    [
      isOpen,
      suggestions,
      activeIdx,
      trimmedQuery,
      selectFromDropdown,
      submitFreeText,
      isLoadingPlaces,
    ],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSearchSelected(null)
    setGridSelected(null)
    setActiveIdx(-1)
    setIsOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const destination = selected ?? trimmedQuery
    if (!destination) return
    if (isSurpriseMeDestination(destination)) {
      handleSurpriseMe()
      return
    }
    onNext(destination)
  }

  const showLoadingRow = useDbSearch && isLoadingPlaces
  const showEmptyApiHint =
    useDbSearch &&
    !isLoadingPlaces &&
    apiFetchedForQuery === trimmedQuery &&
    suggestions.length === 0
  const showDropdown =
    isOpen &&
    (suggestions.length > 0 || showLoadingRow || showEmptyApiHint || apiFetchFailed)

  const dropdownLabel = (() => {
    if (trimmedQuery.length === 0) return 'Popular destinations'
    if (showLoadingRow) return 'Searching…'
    if (apiFetchFailed) return 'Search unavailable'
    if (showEmptyApiHint) return 'No locations found'
    return `${suggestions.length} result${suggestions.length !== 1 ? 's' : ''}`
  })()

  if (surpriseResult) {
    return (
      <div className="mx-auto w-full max-w-[36rem] px-3 sm:px-6">
        <StepDots filled={1} />
        <h1
          className="mb-3 text-center font-display text-[clamp(1.75rem,1.35rem+1.8vw,2.4rem)] italic leading-[1.15] tracking-[-0.025em]"
          style={{ color: 'var(--ink)' }}
        >
          We picked for you:
        </h1>
        <p
          className="mx-auto mb-4 text-center font-display text-[clamp(1.5rem,1.2rem+1.5vw,2rem)] font-bold"
          style={{ color: 'var(--teal)' }}
        >
          {surpriseResult}
        </p>
        <p
          className="mx-auto mb-8 max-w-[28rem] text-center text-[0.9375rem] leading-relaxed"
          style={{ color: 'var(--body)' }}
        >
          Not feeling it? Shuffle again or go back to pick your own.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => onNext(surpriseResult)}
            className="relative inline-flex items-center justify-center rounded-[9px] border-0 bg-[var(--teal)] px-7 py-3.5 font-sans text-base font-semibold tracking-[0.005em] text-white transition-transform duration-150 will-change-transform hover:bg-[var(--teal-hover)] active:scale-[0.97]"
          >
            Continue with {surpriseResult} →
          </button>
          <button
            type="button"
            onClick={handleSurpriseMe}
            className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          >
            Shuffle again
          </button>
          <button
            type="button"
            onClick={() => {
              setSurpriseResult(null)
              setGridSelected(null)
            }}
            className="mt-2 text-sm underline"
            style={{ color: 'var(--muted)' }}
          >
            ← Back to all destinations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[72rem] px-3 sm:px-6">
      <StepDots filled={1} />
      <h1
        id="s1-title"
        className="mb-3 text-center font-display text-[clamp(1.75rem,1.35rem+1.8vw,2.4rem)] italic leading-[1.15] tracking-[-0.025em]"
        style={{ color: 'var(--ink)' }}
      >
        Where does your heart
        <br />
        want to go?
      </h1>
      <p
        id="s1-desc"
        className="mx-auto mb-8 max-w-[28rem] text-center text-[0.9375rem] leading-relaxed"
        style={{ color: 'var(--body)' }}
      >
        Choose a region — or search destinations where our advisors have bookings.
      </p>

      <form aria-labelledby="s1-title" aria-describedby="s1-desc" onSubmit={handleSubmit}>
        <fieldset className="mb-8 border-0 p-0">
          <legend className="sr-only">Destination region</legend>
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
            role="radiogroup"
            aria-label="Destination region"
          >
            {DESTINATIONS.map((d) => {
              const isSel = gridSelected === d.id
              const slug = destinationSlug(d.id)
              const btnId = `destination-${slug}`
              return (
                <button
                  key={d.id}
                  id={btnId}
                  type="button"
                  name="destination"
                  value={d.id}
                  aria-pressed={isSel}
                  aria-label={`${d.label}: ${d.hint}`}
                  onClick={() => selectFromGrid(d.id)}
                  className={`group relative block min-h-[clamp(9.5rem,28vw,13.5rem)] w-full origin-bottom overflow-hidden rounded-2xl border-0 bg-stone-900 text-left shadow-[0_4px_20px_rgba(28,25,23,0.15),0_1px_4px_rgba(28,25,23,0.10)] transition-transform duration-200 will-change-transform [transform:translateZ(0)] hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(28,25,23,0.15)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0F6E56] ${
                    isSel
                      ? '-translate-y-1 scale-[1.015] shadow-[0_0_0_2.5px_#0F6E56,0_4px_20px_rgba(28,25,23,0.15)]'
                      : ''
                  }`}
                  style={{
                    backgroundImage: `url('${d.image}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/22 to-black/5"
                    aria-hidden="true"
                  />
                  <span
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-[rgba(15,110,86,0.32)] to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 ${isSel ? 'opacity-100' : ''}`}
                    aria-hidden="true"
                  />
                  <span className="absolute bottom-5 left-5 right-5 z-[2] font-display text-[clamp(1.15rem,2.8vw,1.45rem)] leading-tight tracking-[-0.01em] text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.55)]">
                    {d.label}
                    <span className="mt-2 block font-sans text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-white/70">
                      {d.hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="relative mb-7 flex items-center">
          <div className="grow border-t" style={{ borderColor: 'var(--border)' }} />
          <span
            className="mx-4 shrink-0 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--muted)' }}
          >
            or search by city or country
          </span>
          <div className="grow border-t" style={{ borderColor: 'var(--border)' }} />
        </div>

        <div ref={containerRef} className="relative mx-auto mb-10 w-full max-w-[34rem]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[1.1rem] leading-none"
            style={{ color: 'var(--muted)' }}
          >
            🔍
          </span>

          <input
            ref={inputRef}
            id="destination-search"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="destination-listbox"
            aria-busy={showLoadingRow}
            aria-activedescendant={
              activeIdx >= 0 ? `dest-option-${activeIdx}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. Italy, Paris, Bali, New York…"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-2xl border py-4 pl-11 pr-10 text-base outline-none transition-all duration-200"
            style={{
              background: 'var(--surface)',
              borderColor: isOpen ? 'var(--teal)' : 'var(--border)',
              boxShadow: isOpen
                ? '0 0 0 3px rgba(15,110,86,0.12), 0 2px 12px rgba(28,25,23,0.08)'
                : '0 2px 8px rgba(28,25,23,0.06)',
              color: 'var(--ink)',
            }}
          />

          {query.length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('')
                setSearchSelected(null)
                setApiSuggestions([])
                setApiFetchFailed(false)
                setApiFetchedForQuery(null)
                setIsOpen(true)
                inputRef.current?.focus()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-sm transition-colors duration-150 hover:bg-black/5"
              style={{ color: 'var(--muted)' }}
            >
              ✕
            </button>
          )}

          {showDropdown && (
            <ul
              ref={listRef}
              id="destination-listbox"
              role="listbox"
              aria-label="Destination suggestions"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-2xl border py-1.5"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow:
                  '0 12px 40px rgba(28,25,23,0.14), 0 4px 12px rgba(28,25,23,0.08)',
              }}
            >
              <li
                className="px-4 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]"
                aria-hidden="true"
                style={{ color: 'var(--muted)' }}
              >
                {dropdownLabel}
              </li>

              {showLoadingRow && (
                <li
                  className="mx-1.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
                  style={{ color: 'var(--muted)' }}
                  aria-live="polite"
                >
                  <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-[var(--teal)] opacity-40" />
                  Loading…
                </li>
              )}

              {(showEmptyApiHint || apiFetchFailed) && !showLoadingRow && (
                <li
                  className="mx-1.5 rounded-xl px-3 py-2.5 text-sm leading-relaxed"
                  style={{ color: 'var(--muted)' }}
                >
                  {apiFetchFailed
                    ? 'Could not load destinations. Press Enter to use your text.'
                    : 'No matching cities or countries with advisor coverage. Try another search or pick a region above.'}
                </li>
              )}

              {suggestions.map((dest, idx) => {
                const isActive = idx === activeIdx
                return (
                  <li
                    key={dest.id}
                    id={`dest-option-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      selectFromDropdown(dest)
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className="mx-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-100"
                    style={{
                      background: isActive ? 'rgba(15,110,86,0.09)' : 'transparent',
                      color: 'var(--ink)',
                    }}
                  >
                    <span className="shrink-0 text-[1.1rem] leading-none">{dest.emoji}</span>
                    <span className="min-w-0 flex-1 truncate font-medium" title={dest.label}>
                      {dest.label}
                    </span>
                    <span
                      className="shrink-0 text-[0.6875rem] font-medium uppercase tracking-[0.06em]"
                      style={{ color: 'var(--muted)' }}
                    >
                      {dest.category}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="mt-2 text-center">
          {(selected || trimmedQuery) && (
            <button
              id="destination-continue"
              type="submit"
              className="relative inline-flex items-center justify-center rounded-[9px] border-0 bg-[var(--teal)] px-7 py-3.5 font-sans text-base font-semibold tracking-[0.005em] text-white transition-transform duration-150 will-change-transform after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[0_6px_24px_rgba(15,110,86,0.24),0_2px_8px_rgba(15,110,86,0.14)] after:opacity-0 after:transition-opacity after:duration-200 hover:bg-[var(--teal-hover)] hover:after:opacity-100 active:scale-[0.97]"
            >
              Continue →
            </button>
          )}
        </div>
      </form>

      <p
        className="mx-auto mt-6 max-w-[26rem] text-center text-sm leading-relaxed"
        style={{ color: 'var(--muted)' }}
      >
        No commitment — just a conversation with a verified expert.
      </p>
    </div>
  )
}
