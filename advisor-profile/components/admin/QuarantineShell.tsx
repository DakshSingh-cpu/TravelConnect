'use client'

import { useCallback, useEffect, useState } from 'react'
import QuarantineLeadCard from '@/components/admin/QuarantineLeadCard'
import type { QuarantineLead } from '@/lib/admin/fetchQuarantineLeads'

export default function QuarantineShell() {
  const [tab, setTab] = useState<'active' | 'dismissed'>('active')
  const [leads, setLeads] = useState<QuarantineLead[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/quarantine?dismissed=${tab === 'dismissed'}`)
      const data = (await res.json()) as { leads?: QuarantineLead[] }
      setLeads(data.leads ?? [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-display text-2xl" style={{ color: 'var(--teal)' }}>
        Lead Quarantine
      </h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--muted)' }}>
        Review blocked leads flagged by background vetting. Override VIP false positives or dismiss permanently.
      </p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'active' ? 'text-white' : ''}`}
          style={{
            background: tab === 'active' ? 'var(--teal)' : 'var(--surface-2)',
            color: tab === 'active' ? '#fff' : 'var(--ink)',
          }}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setTab('dismissed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'dismissed' ? 'text-white' : ''}`}
          style={{
            background: tab === 'dismissed' ? 'var(--teal)' : 'var(--surface-2)',
            color: tab === 'dismissed' ? '#fff' : 'var(--ink)',
          }}
        >
          Dismissed
        </button>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}

      {!loading && leads.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No leads in this queue.</p>
      )}

      <div className="flex flex-col gap-3">
        {leads.map((lead) => (
          <QuarantineLeadCard key={lead.assignmentId} lead={lead} onUpdated={() => void reload()} />
        ))}
      </div>
    </div>
  )
}
