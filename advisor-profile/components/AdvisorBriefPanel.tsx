'use client'

import { motion } from 'framer-motion'
import type { AdvisorBrief } from '@/lib/advisorBrief'

type Props = {
  brief: AdvisorBrief
  compact?: boolean
  /** Remove max-height cap — used in full-screen client brief overlay. */
  unbounded?: boolean
}

export default function AdvisorBriefPanel({ brief, compact = false, unbounded = false }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border text-left shadow-sm backdrop-blur-md overflow-y-auto ${
        unbounded ? '' : 'max-h-[65vh]'
      } ${compact ? 'p-4' : 'p-5'}`}
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
    >
      <p
        className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em]"
        style={{ color: 'var(--section-label)' }}
      >
        Advisor brief
      </p>
      <p className={`leading-relaxed ${compact ? 'text-sm' : 'text-[0.9375rem]'}`} style={{ color: 'var(--ink)' }}>
        {brief.tldr}
      </p>

      <motion.div
        className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          className="rounded-xl border px-3 py-2.5"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Budget
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {brief.hard_constraints.budget}
          </p>
        </motion.div>
        <motion.div
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          className="rounded-xl border px-3 py-2.5"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Dates
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {brief.hard_constraints.dates}
          </p>
        </motion.div>
        {brief.hard_constraints.pax != null && (
          <motion.div
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            className="rounded-xl border px-3 py-2.5"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Travelers
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {brief.hard_constraints.pax}
            </p>
          </motion.div>
        )}
      </motion.div>

      {!compact && (
        <>
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Key decisions
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm" style={{ color: 'var(--body)' }}>
              {brief.key_decisions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <motion.div
            className="mt-4 rounded-xl border px-4 py-3"
            style={{ borderColor: 'rgba(15,110,86,0.2)', background: 'var(--teal-light)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--teal)' }}>
              Action items for advisor
            </p>
            <ul className="list-inside list-decimal space-y-1 text-sm" style={{ color: 'var(--ink)' }}>
              {brief.advisor_action_items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
