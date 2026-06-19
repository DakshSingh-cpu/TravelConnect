'use client'

import { useCallback, useEffect, useState } from 'react'
import type { QuarantineLead } from '@/lib/admin/fetchQuarantineLeads'

type Props = {
  lead: QuarantineLead
  onUpdated: () => void
}

export default function QuarantineLeadCard({ lead, onUpdated }: Props) {
  const [busy, setBusy] = useState<'override' | 'dismiss' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function overrideLead() {
    setBusy('override')
    setError(null)
    try {
      const res = await fetch('/api/admin/override-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: lead.assignmentId }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? 'Override failed')
        return
      }
      onUpdated()
    } catch {
      setError('Override failed')
    } finally {
      setBusy(null)
    }
  }

  async function dismissLead() {
    setBusy('dismiss')
    setError(null)
    try {
      const res = await fetch('/api/admin/dismiss-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: lead.assignmentId }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? 'Dismiss failed')
        return
      }
      onUpdated()
    } catch {
      setError('Dismiss failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {lead.travellerName ?? 'Traveller'} · {lead.destination ?? 'Unknown'}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Score {lead.vettingScore ?? '—'} · {lead.status}
          </p>
        </div>
        {lead.readinessTier && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
            {lead.readinessTier}
          </span>
        )}
      </div>

      {lead.budgetLakh != null && (
        <p className="mb-1 text-xs" style={{ color: 'var(--body)' }}>
          Budget ₹{lead.budgetLakh}L
          {lead.residentialZip && ` · Zip ${lead.residentialZip}`}
          {lead.affluenceTier && ` · Affluence tier ${lead.affluenceTier}`}
        </p>
      )}

      {lead.reasonCodes.length > 0 && (
        <ul className="mb-3 list-inside list-disc text-xs" style={{ color: 'var(--muted)' }}>
          {lead.reasonCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mb-2 text-xs" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}

      {lead.status === 'blocked' && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void overrideLead()}
            className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--teal)' }}
          >
            {busy === 'override' ? 'Approving…' : 'Override to Approved'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void dismissLead()}
            className="flex-1 rounded-lg border py-2 text-sm disabled:opacity-60"
            style={{ borderColor: 'var(--border)' }}
          >
            {busy === 'dismiss' ? 'Dismissing…' : 'Confirm Dismiss'}
          </button>
        </div>
      )}
    </div>
  )
}
