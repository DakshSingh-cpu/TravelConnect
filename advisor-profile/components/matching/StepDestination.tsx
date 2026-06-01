'use client'

import { useState } from 'react'

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
      'https://images.unsplash.com/photo-1528181304800-259b08848561?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'Japan',
    label: 'Japan',
    hint: 'Design & precision',
    image:
      'https://images.unsplash.com/photo-1493976040374-85c8e12d0ce0?auto=format&fit=crop&w=1000&q=80',
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
      'https://images.unsplash.com/photo-1547471080-7cc2caa04ccb?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'Surprise me',
    label: 'Surprise me',
    hint: 'Let Priya choose',
    image:
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80',
  },
] as const

function destinationSlug(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '-')
}

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

export default function StepDestination({ onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

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
        Choose a region — we match you with a verified expert backed by real TravelConnect booking data.
      </p>

      <form
        aria-labelledby="s1-title"
        aria-describedby="s1-desc"
        onSubmit={(e) => {
          e.preventDefault()
          if (selected) onNext(selected)
        }}
      >
        <fieldset className="mb-6 border-0 p-0">
          <legend className="sr-only">Destination region</legend>
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
            role="radiogroup"
            aria-label="Destination region"
          >
            {DESTINATIONS.map((d) => {
              const isSel = selected === d.id
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
                  onClick={() => setSelected(d.id)}
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

        <div className="mt-6 text-center">
          {selected && (
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
