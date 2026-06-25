'use client'

import { motion } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion/onboardingVariants'
import RadioCardList, {
  type RadioOption,
} from '@/components/onboarding/inputs/RadioCardList'

type Contact = {
  name: string
  email: string
  phone: string
  preferredMethod: string
  language: string
}

type Props = {
  contact: Contact
  onChange: (contact: Contact) => void
}

const contactMethods: RadioOption[] = [
  { id: 'email', label: 'Email', emoji: '✉️' },
  { id: 'phone', label: 'Phone', emoji: '📞' },
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
]

const languages = ['English', 'Hindi', 'Tamil', 'Bengali', 'Other'] as const

const inputClasses =
  'w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-150 placeholder:opacity-50 focus:ring-2'

const inputStyle = {
  borderColor: 'var(--border, rgba(28,25,23,0.09))',
  backgroundColor: 'var(--surface, #fff)',
  color: 'var(--ink, #1c1917)',
  '--tw-ring-color': 'var(--teal, #0F6E56)',
} as React.CSSProperties

const labelClasses =
  'mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.09em]'

const labelStyle = { color: 'var(--muted, #78716c)' }

export default function Step10Contact({ contact, onChange }: Props) {
  function update(field: keyof Contact, value: string) {
    onChange({ ...contact, [field]: value })
  }

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
        How should your advisor contact you?
      </motion.h2>

      {/* Name */}
      <motion.div variants={staggerItemVariants}>
        <label htmlFor="contact-name" className={labelClasses} style={labelStyle}>
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          value={contact.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Your full name"
          aria-label="Full name"
          className={inputClasses}
          style={inputStyle}
        />
      </motion.div>

      {/* Email */}
      <motion.div variants={staggerItemVariants}>
        <label htmlFor="contact-email" className={labelClasses} style={labelStyle}>
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          value={contact.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className={inputClasses}
          style={inputStyle}
        />
      </motion.div>

      {/* Phone */}
      <motion.div variants={staggerItemVariants} className="flex flex-col gap-1">
        <label htmlFor="contact-phone" className={labelClasses} style={labelStyle}>
          Phone
        </label>
        <input
          id="contact-phone"
          type="tel"
          value={contact.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="+91 98765 43210"
          aria-label="Phone number"
          className={inputClasses}
          style={inputStyle}
        />
        <div
          className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed"
          style={{ color: 'var(--muted, #78716c)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
              clipRule="evenodd"
            />
          </svg>
          <span>We&apos;ll verify this number later before matching you with an advisor.</span>
        </div>
      </motion.div>

      {/* Preferred contact method */}
      <motion.div variants={staggerItemVariants}>
        <RadioCardList
          options={contactMethods}
          selected={contact.preferredMethod}
          onChange={(id) => update('preferredMethod', id)}
          label="Preferred contact method"
        />
      </motion.div>

      {/* Language */}
      <motion.div variants={staggerItemVariants}>
        <label htmlFor="contact-language" className={labelClasses} style={labelStyle}>
          Language
        </label>
        <select
          id="contact-language"
          value={contact.language}
          onChange={(e) => update('language', e.target.value)}
          aria-label="Preferred language"
          className={inputClasses}
          style={inputStyle}
        >
          <option value="" disabled>
            Select a language
          </option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </motion.div>
    </motion.div>
  )
}
