'use client'

import { useEffect, useRef, useState } from 'react'

const TEAL = '#0F6E56'
const TRACK = 'rgba(15,110,86,0.12)'

type Props = {
  value: number
  label: string
  suffix?: string
  className?: string
}

/** Semi-circular gauge; animates 0 → value on mount or when scrolled into view. */
export default function MetricSpeedometer({ value, label, suffix = '%', className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)
  const [displayValue, setDisplayValue] = useState(0)

  const clamped = Math.max(0, Math.min(100, value))
  const radius = 72
  const cx = 100
  const cy = 96
  const startAngle = Math.PI
  const endAngle = 0
  const x1 = cx + radius * Math.cos(startAngle)
  const y1 = cy + radius * Math.sin(startAngle)
  const x2 = cx + radius * Math.cos(endAngle)
  const y2 = cy + radius * Math.sin(endAngle)
  const arcPath = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`
  const arcLength = Math.PI * radius

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setAnimated(true)
      setDisplayValue(clamped)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [clamped])

  useEffect(() => {
    if (!animated) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplayValue(clamped)
      return
    }

    const duration = 1200
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayValue(clamped * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animated, clamped])

  const strokeOffset = arcLength * (1 - displayValue / 100)

  return (
    <div
      ref={rootRef}
      className={`flex flex-col items-center ${className}`}
      role="img"
      aria-label={`${label}: ${clamped.toFixed(0)}${suffix}`}
    >
      <div className="relative w-full max-w-[200px]">
        <svg viewBox="0 0 200 112" className="w-full" aria-hidden="true">
          <path
            d={arcPath}
            fill="none"
            stroke={TRACK}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d={arcPath}
            fill="none"
            stroke={TEAL}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeOffset}
            style={{
              transition: animated
                ? 'stroke-dashoffset 80ms linear'
                : 'stroke-dashoffset 0ms',
              filter: 'drop-shadow(0 2px 6px rgba(15,110,86,0.2))',
            }}
          />
        </svg>
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-0.5"
          style={{ color: 'var(--ink)' }}
        >
          <span className="font-display text-3xl tabular-nums leading-none">
            {Math.round(displayValue)}
            <span className="text-lg font-sans font-semibold" style={{ color: 'var(--teal)' }}>
              {suffix}
            </span>
          </span>
        </div>
      </div>
      <p
        className="mt-2 text-center text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </p>
    </div>
  )
}
