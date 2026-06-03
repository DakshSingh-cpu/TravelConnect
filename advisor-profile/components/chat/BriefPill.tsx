'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdvisorBriefPanel from '@/components/AdvisorBriefPanel'
import type { AdvisorBrief } from '@/lib/advisorBrief'

type Props = {
  brief: AdvisorBrief
}

/** Extracts a short "destination · budget" summary for the pill label. */
function pillLabel(brief: AdvisorBrief): string {
  // Try to extract destination from key_decisions e.g. "Destination: Bali"
  const destDecision = brief.key_decisions.find((d) =>
    d.toLowerCase().startsWith('destination:'),
  )
  const dest = destDecision ? destDecision.split(':')[1]?.trim() : null
  const budget = brief.hard_constraints.budget

  if (dest && budget) return `${dest} · ${budget}`
  if (dest) return dest
  if (budget) return budget
  return 'View brief'
}

export default function BriefPill({ brief }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative flex justify-center py-3">
      {/* Pill trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm transition-all hover:shadow-md active:scale-[0.97]"
        style={{
          background: 'var(--teal-light, #e8f5f0)',
          borderColor: 'rgba(15,110,86,0.25)',
          color: 'var(--teal, #0F6E56)',
        }}
        aria-expanded={open}
        aria-label="View client brief"
      >
        <span>📋</span>
        <span>Client Brief</span>
        <span className="opacity-60">·</span>
        <span className="max-w-[160px] truncate opacity-80">{pillLabel(brief)}</span>
        <span
          className="ml-0.5 text-[10px] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
        >
          ▾
        </span>
      </button>

      {/* Popover panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full z-50 w-[360px] max-w-[calc(100vw-2rem)]"
            style={{ marginTop: 6 }}
          >
            {/* Close button row */}
            <div className="mb-1 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-0.5 text-xs hover:opacity-70"
                style={{ color: 'var(--muted)' }}
                aria-label="Close brief"
              >
                ✕ close
              </button>
            </div>
            <AdvisorBriefPanel brief={brief} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
