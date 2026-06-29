'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'
import ChipSelect, { type ChipOption } from '@/components/onboarding/inputs/ChipSelect'
import { todayLocalISO } from '@/lib/onboarding/dates'

type Props = {
  timingMode: 'dates' | 'flexible' | undefined
  travelDates?: { start?: string; end?: string }
  lengthOfStay?: string
  flexibleMonths?: string[]
  onChange: (fields: Record<string, unknown>) => void
}

const lengthOptions: ChipOption[] = [
  { id: '<5_days', label: '< 5 days' },
  { id: '1_2_weeks', label: '1–2 weeks' },
  { id: '2_plus_weeks', label: '2+ weeks' },
]

const monthOptions: ChipOption[] = [
  { id: 'jan', label: 'Jan' },
  { id: 'feb', label: 'Feb' },
  { id: 'mar', label: 'Mar' },
  { id: 'apr', label: 'Apr' },
  { id: 'may', label: 'May' },
  { id: 'jun', label: 'Jun' },
  { id: 'jul', label: 'Jul' },
  { id: 'aug', label: 'Aug' },
  { id: 'sep', label: 'Sep' },
  { id: 'oct', label: 'Oct' },
  { id: 'nov', label: 'Nov' },
  { id: 'dec', label: 'Dec' },
]

export default function Step03Timing({
  timingMode,
  travelDates,
  lengthOfStay,
  flexibleMonths: selectedMonths,
  onChange,
}: Props) {
  const today = todayLocalISO()
  const start = travelDates?.start
  const end = travelDates?.end
  const startInPast = !!start && start < today
  const endBeforeStart = !!end && ((!!start && end < start) || end < today)
  const dateError = startInPast
    ? "Start date can't be in the past."
    : endBeforeStart
    ? 'End date must be on or after the start date.'
    : null

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.h2
        variants={staggerItemVariants}
        className="text-2xl font-bold tracking-tight"
        style={{ color: 'var(--ink, #1c1917)' }}
      >
        When and how long are you thinking of traveling?
      </motion.h2>

      <motion.div variants={staggerItemVariants} className="flex gap-2">
        {(['dates', 'flexible'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ timingMode: mode })}
            aria-pressed={timingMode === mode}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150"
            style={{
              backgroundColor:
                timingMode === mode
                  ? 'var(--teal, #0F6E56)'
                  : 'var(--surface, #fff)',
              color:
                timingMode === mode
                  ? '#fff'
                  : 'var(--body, #44403c)',
              border:
                timingMode === mode
                  ? '1px solid var(--teal, #0F6E56)'
                  : '1px solid var(--border, rgba(28,25,23,0.09))',
            }}
          >
            {mode === 'dates' ? 'Specific dates' : "I'm flexible"}
          </button>
        ))}
      </motion.div>

      {timingMode === 'dates' && (
        <>
          <motion.div
            variants={staggerItemVariants}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <label
                htmlFor="travel-start"
                className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
                style={{ color: 'var(--muted, #78716c)' }}
              >
                Start date
              </label>
              <input
                id="travel-start"
                type="date"
                min={today}
                value={travelDates?.start ?? ''}
                onChange={(e) =>
                  onChange({
                    travelDates: { ...travelDates, start: e.target.value },
                  })
                }
                aria-label="Travel start date"
                aria-invalid={startInPast}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-150 focus:ring-2"
                style={{
                  borderColor: 'var(--border, rgba(28,25,23,0.09))',
                  backgroundColor: 'var(--surface, #fff)',
                  color: 'var(--ink, #1c1917)',
                  // @ts-expect-error CSS custom property for ring color
                  '--tw-ring-color': 'var(--teal, #0F6E56)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="travel-end"
                className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.09em]"
                style={{ color: 'var(--muted, #78716c)' }}
              >
                End date
              </label>
              <input
                id="travel-end"
                type="date"
                min={travelDates?.start || today}
                value={travelDates?.end ?? ''}
                onChange={(e) =>
                  onChange({
                    travelDates: { ...travelDates, end: e.target.value },
                  })
                }
                aria-label="Travel end date"
                aria-invalid={endBeforeStart}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-150 focus:ring-2"
                style={{
                  borderColor: 'var(--border, rgba(28,25,23,0.09))',
                  backgroundColor: 'var(--surface, #fff)',
                  color: 'var(--ink, #1c1917)',
                  // @ts-expect-error CSS custom property for ring color
                  '--tw-ring-color': 'var(--teal, #0F6E56)',
                }}
              />
            </div>
          </motion.div>

          {dateError && (
            <motion.p
              variants={staggerItemVariants}
              role="alert"
              className="-mt-2 text-sm font-medium text-red-600"
            >
              {dateError}
            </motion.p>
          )}

          <motion.div variants={staggerItemVariants}>
            <ChipSelect
              options={lengthOptions}
              selected={lengthOfStay ? [lengthOfStay] : []}
              onChange={(sel) => onChange({ lengthOfStay: sel[0] ?? undefined })}
              columns={3}
              label="Length of stay"
            />
          </motion.div>
        </>
      )}

      {timingMode === 'flexible' && (
        <motion.div variants={staggerItemVariants}>
          <ChipSelect
            options={monthOptions}
            selected={selectedMonths ?? []}
            onChange={(sel) => onChange({ flexibleMonths: sel })}
            multi
            columns={4}
            label="Which months work?"
          />
        </motion.div>
      )}
    </motion.div>
  )
}
