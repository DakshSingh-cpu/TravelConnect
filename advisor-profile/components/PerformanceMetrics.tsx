'use client'

import type { AgentProfile } from '@/lib/agencyDataProcessor'
import MetricSpeedometer from '@/components/MetricSpeedometer'

type Props = {
  agentProfile: AgentProfile | null
}

function formatCurrency(amount: number): string {
  if (amount <= 0) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatConfirmationSpeed(days: number): string {
  if (days <= 0) return '—'
  const rounded = days < 10 ? days.toFixed(1) : days.toFixed(0)
  const unit = parseFloat(rounded) === 1 ? 'Day' : 'Days'
  return `Avg ${rounded} ${unit} to Confirm`
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function SupportingMetric({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex flex-1 flex-col justify-center rounded-xl border px-5 py-4"
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      <p className="font-display text-xl leading-tight" style={{ color: 'var(--teal)' }}>
        {value}
      </p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--ink)' }}>
        {label}
      </p>
    </div>
  )
}

function VerifiedPlatformGauges({ profile }: { profile: AgentProfile }) {
  const {
    agencyName,
    repeatClientRate,
    tripFulfillmentRate,
    bookToVouchDaysHotelAvg,
    avgBookingValue,
    totalVerifiedTrips,
    numBookingsVouchHotelTotal,
  } = profile

  const hasBookingActivity = totalVerifiedTrips > 0 || numBookingsVouchHotelTotal > 0
  const hasConfirmSpeed = bookToVouchDaysHotelAvg > 0
  const hasAvgBooking = avgBookingValue > 0
  const hasAnyGauge = hasBookingActivity || hasConfirmSpeed || hasAvgBooking

  if (!hasAnyGauge && !hasConfirmSpeed && !hasAvgBooking) {
    return (
      <p
        className="rounded-xl border px-4 py-4 text-sm leading-relaxed"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--body)' }}
      >
        Core loyalty and fulfillment metrics for {agencyName} are still building in this reporting
        window — volume and destination expertise above reflect current platform activity.
      </p>
    )
  }

  return (
    <div
      className="rounded-xl border p-5 sm:p-6"
      style={{
        background: 'linear-gradient(165deg, #F9F6F1 0%, rgba(232,245,239,0.45) 100%)',
        borderColor: 'rgba(15,110,86,0.14)',
      }}
    >
      <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--teal)' }}>
        Trust & completion signals
      </p>

      {hasBookingActivity && (
        <div className="mb-5 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
          <MetricSpeedometer value={repeatClientRate} label="Repeat Client Rate" />
          <MetricSpeedometer value={tripFulfillmentRate} label="Trip Fulfillment Rate" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SupportingMetric
          value={hasConfirmSpeed ? formatConfirmationSpeed(bookToVouchDaysHotelAvg) : '—'}
          label="Confirmation Speed"
        />
        <SupportingMetric
          value={hasAvgBooking ? `${formatCurrency(avgBookingValue)} Avg Booking` : '—'}
          label="Avg Booking Value"
        />
      </div>
    </div>
  )
}

export default function PerformanceMetrics({ agentProfile }: Props) {
  if (!agentProfile) {
    return (
      <section
        className="rounded-2xl border p-7 shadow-lg backdrop-blur-xl"
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
      >
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Verified platform metrics are unavailable for this partner.
        </p>
      </section>
    )
  }

  const { agencyName, agentBookingTypeLabel, platformSegment, repeatClientRate } = agentProfile

  return (
    <section
      className="rounded-2xl border p-7 shadow-lg backdrop-blur-xl"
      aria-labelledby="metrics-title"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}
          >
            <ShieldIcon className="h-5 w-5" />
          </div>
          <div>
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--section-label)' }}
            >
              Verified Platform Metrics
            </p>
            <h2 id="metrics-title" className="font-display text-xl" style={{ color: 'var(--ink)' }}>
              Depth beyond the headline numbers
            </h2>
          </div>
        </div>
        {platformSegment && (
          <span
            className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor: 'rgba(15,110,86,0.25)',
              background: 'var(--teal-light)',
              color: 'var(--teal)',
            }}
          >
            {platformSegment}
          </span>
        )}
      </div>

      <VerifiedPlatformGauges profile={agentProfile} />

      {agentBookingTypeLabel && (
        <p
          className="mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--body)',
          }}
        >
          <span className="shrink-0 font-semibold" style={{ color: 'var(--teal)' }}>
            Booking focus:
          </span>
          <span>{agentBookingTypeLabel}</span>
        </p>
      )}

      {repeatClientRate > 10 && (
        <p
          className="mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium"
          style={{
            background: 'rgba(186,117,23,0.06)',
            borderColor: 'rgba(186,117,23,0.15)',
            color: 'var(--gold)',
          }}
        >
          <span aria-hidden="true">⭐</span>
          Strong repeat-booking signal — clients come back to {agencyName}
        </p>
      )}
    </section>
  )
}
