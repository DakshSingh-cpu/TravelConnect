'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'
import ChipSelect, { type ChipOption } from '@/components/onboarding/inputs/ChipSelect'

const MIN_SPEND = 1_00_000   // ₹1L
const MAX_SPEND = 1_00_00_000 // ₹1 Cr (kept as upper bound for the formula)

type Props = {
  travelStyle: string | null
  nightlySpend: number | undefined
  onStyleChange: (s: string) => void
  onSpendChange: (n: number | undefined) => void
}

const styleOptions: ChipOption[] = [
  { id: 'luxe', label: 'Luxe', emoji: '✨' },
  { id: 'boutique', label: 'Boutique', emoji: '🏨' },
  { id: 'budget', label: 'Budget', emoji: '💰' },
]

/** Convert a linear slider position [0,1] to an exponential spend value. */
function sliderToSpend(pos: number): number {
  const logMin = Math.log(MIN_SPEND)
  const logMax = Math.log(MAX_SPEND)
  return Math.round(Math.exp(logMin + pos * (logMax - logMin)))
}

/** Convert a spend value back to a linear slider position [0,1]. */
function spendToSlider(spend: number): number {
  const logMin = Math.log(MIN_SPEND)
  const logMax = Math.log(MAX_SPEND)
  return (Math.log(Math.max(spend, MIN_SPEND)) - logMin) / (logMax - logMin)
}

function formatSpendLabel(value: number): string {
  if (value >= 1_00_00_000) return '₹1 Cr'
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(value % 1_00_000 === 0 ? 0 : 1)}L`
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`
  return `₹${value}`
}

export default function Step07StyleBudget({
  travelStyle,
  nightlySpend,
  onStyleChange,
  onSpendChange,
}: Props) {
  function handleStyleChange(selected: string[]) {
    if (selected.length > 0) {
      onStyleChange(selected[0])
    }
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const pos = parseFloat(e.target.value) / 1000
    onSpendChange(sliderToSpend(pos))
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === '') {
      onSpendChange(undefined)
      return
    }
    const num = parseInt(raw, 10)
    if (!Number.isNaN(num) && num >= 0) {
      onSpendChange(num)
    }
  }

  const sliderPos = nightlySpend !== undefined
    ? Math.round(spendToSlider(nightlySpend) * 1000)
    : 0

  const fillPct = (sliderPos / 1000) * 100

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      aria-label="Travel style and budget"
    >
      <motion.h2
        variants={staggerItemVariants}
        className="mb-6 text-xl font-bold"
        style={{ color: 'var(--ink, #1c1917)' }}
      >
        What&apos;s your travel style these days?
      </motion.h2>

      <motion.div variants={staggerItemVariants}>
        <ChipSelect
          options={styleOptions}
          selected={travelStyle ? [travelStyle] : []}
          onChange={handleStyleChange}
          columns={3}
          label="Travel style"
        />
      </motion.div>

      <motion.div variants={staggerItemVariants} className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <label
            htmlFor="nightly-spend"
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
            style={{ color: 'var(--muted, #78716c)' }}
          >
            Total trip budget
          </label>
          {nightlySpend !== undefined && (
            <span
              className="text-xs font-semibold"
              style={{ color: 'var(--teal, #0F6E56)' }}
            >
              {formatSpendLabel(nightlySpend)}
            </span>
          )}
        </div>

        {/* Slider */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={sliderPos}
            onChange={handleSliderChange}
            aria-label="Total trip budget slider"
            className="w-full cursor-pointer appearance-none rounded-full"
            style={{
              height: '6px',
              background: `linear-gradient(to right, var(--teal, #0F6E56) ${fillPct}%, var(--border, rgba(28,25,23,0.15)) ${fillPct}%)`,
              outline: 'none',
            }}
          />
          <div
            className="mt-1 flex justify-between text-[0.625rem] font-medium"
            style={{ color: 'var(--muted, #78716c)' }}
          >
            <span>₹1L</span>
            <span>₹100L</span>
          </div>
        </div>

        {/* Manual input */}
        <div className="relative max-w-xs">
          <span
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: 'var(--muted, #78716c)' }}
            aria-hidden
          >
            ₹
          </span>
          <input
            id="nightly-spend"
            type="number"
            inputMode="numeric"
            min={MIN_SPEND}
            max={MAX_SPEND}
            placeholder="e.g. 1500000"
            value={nightlySpend ?? ''}
            onChange={handleInputChange}
            className="w-full rounded-xl border py-3 pl-8 pr-4 text-sm outline-none transition-colors focus:ring-2"
            style={{
              borderColor: 'var(--border, rgba(28,25,23,0.09))',
              backgroundColor: 'var(--surface, #fff)',
              color: 'var(--ink, #1c1917)',
              // @ts-expect-error -- CSS custom property
              '--tw-ring-color': 'var(--teal, #0F6E56)',
            }}
            aria-label="Total trip budget in INR"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
