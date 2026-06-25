'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'

type Props = {
  value: string | null
  onChange: (region: string) => void
}

type Suggestion = {
  display_name: string
  place_id: number
  lat: string
  lon: string
}

const POPULAR_CITIES = [
  { label: 'New Delhi, India', emoji: '🇮🇳' },
  { label: 'Mumbai, India', emoji: '🇮🇳' },
  { label: 'Bangalore, India', emoji: '🇮🇳' },
  { label: 'Dubai, UAE', emoji: '🇦🇪' },
  { label: 'London, UK', emoji: '🇬🇧' },
  { label: 'New York, USA', emoji: '🇺🇸' },
  { label: 'Paris, France', emoji: '🇫🇷' },
  { label: 'Singapore', emoji: '🇸🇬' },
  { label: 'Bangkok, Thailand', emoji: '🇹🇭' },
  { label: 'Sydney, Australia', emoji: '🇦🇺' },
  { label: 'Tokyo, Japan', emoji: '🇯🇵' },
  { label: 'Toronto, Canada', emoji: '🇨🇦' },
]

function getCountryEmoji(displayName: string): string {
  const lower = displayName.toLowerCase()
  if (lower.includes('india')) return '🇮🇳'
  if (lower.includes('united states') || lower.includes('usa')) return '🇺🇸'
  if (lower.includes('united kingdom') || lower.includes('england') || lower.includes('scotland') || lower.includes('wales')) return '🇬🇧'
  if (lower.includes('france')) return '🇫🇷'
  if (lower.includes('germany')) return '🇩🇪'
  if (lower.includes('italy')) return '🇮🇹'
  if (lower.includes('spain')) return '🇪🇸'
  if (lower.includes('japan')) return '🇯🇵'
  if (lower.includes('china')) return '🇨🇳'
  if (lower.includes('australia')) return '🇦🇺'
  if (lower.includes('canada')) return '🇨🇦'
  if (lower.includes('singapore')) return '🇸🇬'
  if (lower.includes('thailand')) return '🇹🇭'
  if (lower.includes('dubai') || lower.includes('united arab emirates') || lower.includes('uae')) return '🇦🇪'
  if (lower.includes('brazil')) return '🇧🇷'
  if (lower.includes('mexico')) return '🇲🇽'
  if (lower.includes('south africa')) return '🇿🇦'
  if (lower.includes('pakistan')) return '🇵🇰'
  if (lower.includes('bangladesh')) return '🇧🇩'
  if (lower.includes('sri lanka')) return '🇱🇰'
  if (lower.includes('nepal')) return '🇳🇵'
  if (lower.includes('indonesia')) return '🇮🇩'
  if (lower.includes('malaysia')) return '🇲🇾'
  if (lower.includes('philippines')) return '🇵🇭'
  if (lower.includes('south korea') || lower.includes('korea')) return '🇰🇷'
  if (lower.includes('vietnam')) return '🇻🇳'
  if (lower.includes('turkey')) return '🇹🇷'
  if (lower.includes('egypt')) return '🇪🇬'
  if (lower.includes('kenya')) return '🇰🇪'
  if (lower.includes('portugal')) return '🇵🇹'
  if (lower.includes('netherlands')) return '🇳🇱'
  if (lower.includes('sweden')) return '🇸🇪'
  if (lower.includes('norway')) return '🇳🇴'
  if (lower.includes('switzerland')) return '🇨🇭'
  if (lower.includes('argentina')) return '🇦🇷'
  if (lower.includes('colombia')) return '🇨🇴'
  if (lower.includes('new zealand')) return '🇳🇿'
  if (lower.includes('greece')) return '🇬🇷'
  if (lower.includes('russia')) return '🇷🇺'
  return '🌍'
}

function formatSuggestion(displayName: string): string {
  // Nominatim returns long names like "New Delhi, Delhi, India"
  // Shorten to first 2 meaningful parts
  const parts = displayName.split(', ')
  if (parts.length <= 2) return displayName
  // Keep city + country (last item)
  const city = parts[0]
  const country = parts[parts.length - 1]
  return `${city}, ${country}`
}

export default function Step08Location({ value, onChange }: Props) {
  const [query, setQuery] = useState(value ?? '')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showPopular, setShowPopular] = useState(!value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setShowPopular(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInputChange(val: string) {
    setQuery(val)

    if (!val.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      setShowPopular(true)
      return
    }

    setShowPopular(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=0&limit=6&featuretype=city`
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' },
        })
        const data = (await res.json()) as Suggestion[]
        setSuggestions(data)
        setShowDropdown(data.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 350)
  }

  function handleSelect(label: string) {
    setQuery(label)
    onChange(label)
    setShowDropdown(false)
    setShowPopular(false)
    setSuggestions([])
  }

  function handlePopularSelect(label: string) {
    setQuery(label)
    onChange(label)
    setShowPopular(false)
  }

  const popularFiltered = query.trim()
    ? POPULAR_CITIES.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : POPULAR_CITIES

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      aria-label="Location selection"
      className="flex flex-col gap-4"
    >
      <motion.h2
        variants={staggerItemVariants}
        className="text-2xl font-bold tracking-tight"
        style={{ color: 'var(--ink, #1c1917)' }}
      >
        Where in the world are you based right now?
      </motion.h2>

      <motion.div variants={staggerItemVariants} className="relative" ref={containerRef}>
        {/* Search input */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base">
            📍
          </span>
          <input
            ref={inputRef}
            id="location-search"
            type="text"
            placeholder="Search any city or country…"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (!query.trim()) setShowPopular(true)
              else if (suggestions.length > 0) setShowDropdown(true)
            }}
            autoComplete="off"
            aria-label="Search your city or country"
            aria-autocomplete="list"
            aria-controls="location-suggestions"
            className="w-full rounded-xl border py-3 pl-10 pr-10 text-sm outline-none transition-all duration-150 focus:ring-2"
            style={{
              borderColor: value ? 'var(--teal, #0F6E56)' : 'var(--border, rgba(28,25,23,0.09))',
              backgroundColor: 'var(--surface, #fff)',
              color: 'var(--ink, #1c1917)',
              boxShadow: value ? '0 0 0 2px rgba(15,110,86,0.15)' : undefined,
              // @ts-expect-error -- CSS custom property
              '--tw-ring-color': 'var(--teal, #0F6E56)',
            }}
          />
          {/* Loading spinner or clear button */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <span
                className="block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: 'var(--teal, #0F6E56)', borderTopColor: 'transparent' }}
              />
            ) : value && query === value ? (
              <span className="text-sm" style={{ color: 'var(--teal, #0F6E56)' }}>✓</span>
            ) : null}
          </span>
        </div>

        {/* Selected value confirmation */}
        {value && query === value && (
          <p className="mt-1.5 text-xs font-medium" style={{ color: 'var(--teal, #0F6E56)' }}>
            ✓ Location set — you can continue
          </p>
        )}

        {/* Autocomplete dropdown from Nominatim */}
        <AnimatePresence>
          {showDropdown && suggestions.length > 0 && (
            <motion.ul
              id="location-suggestions"
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg"
              style={{
                borderColor: 'var(--border, rgba(28,25,23,0.09))',
                background: 'var(--surface, #fff)',
              }}
            >
              {suggestions.map((s) => {
                const label = formatSuggestion(s.display_name)
                const emoji = getCountryEmoji(s.display_name)
                return (
                  <li
                    key={s.place_id}
                    role="option"
                    aria-selected={value === label}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100"
                    style={{ color: 'var(--ink, #1c1917)' }}
                    onMouseDown={() => handleSelect(label)}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background =
                        'rgba(15,110,86,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background = ''
                    }}
                  >
                    <span className="shrink-0 text-base">{emoji}</span>
                    <span className="truncate">{label}</span>
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Popular cities quick-pick */}
        <AnimatePresence>
          {showPopular && !showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg"
              style={{
                borderColor: 'var(--border, rgba(28,25,23,0.09))',
                background: 'var(--surface, #fff)',
              }}
            >
              <p
                className="px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--muted, #78716c)' }}
              >
                Popular cities
              </p>
              <ul role="listbox">
                {popularFiltered.slice(0, 8).map((city) => (
                  <li
                    key={city.label}
                    role="option"
                    aria-selected={value === city.label}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors duration-100"
                    style={{ color: 'var(--ink, #1c1917)' }}
                    onMouseDown={() => handlePopularSelect(city.label)}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background =
                        'rgba(15,110,86,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.background = ''
                    }}
                  >
                    <span className="shrink-0 text-base">{city.emoji}</span>
                    <span className="truncate">{city.label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hint text */}
      {!value && (
        <motion.p
          variants={staggerItemVariants}
          className="text-xs"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          Start typing any city, region or country — e.g. "Delhi", "California", "France"
        </motion.p>
      )}
    </motion.div>
  )
}
