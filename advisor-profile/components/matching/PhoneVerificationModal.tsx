'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  PhoneValidationError,
} from '@/lib/phoneVerification'

type Props = {
  onVerified: () => void
  onDismiss: () => void
}

export default function PhoneVerificationModal({ onVerified, onDismiss }: Props) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const phoneDigits = phone.replace(/\D/g, '')
  const canSend = phoneDigits.length >= 10

  async function handleSendOtp() {
    setLoading(true)
    setError(null)
    try {
      const { error: sendError } = await sendPhoneOtp(phone)
      if (sendError) {
        setError(sendError)
        return
      }
      setStage('otp')
    } catch (err) {
      if (err instanceof PhoneValidationError) {
        setError(err.message)
      } else {
        setError('Failed to send verification code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    setLoading(true)
    setError(null)
    try {
      const { success, error: verifyError } = await verifyPhoneOtp(phone, otp)
      if (!success) {
        setError(verifyError ?? 'Invalid code. Please try again.')
        return
      }
      onVerified()
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-verify-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onDismiss}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl border p-6 shadow-xl"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <h2
          id="phone-verify-title"
          className="font-display text-xl"
          style={{ color: 'var(--ink)' }}
        >
          Verify your number
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          A quick verification ensures advisors receive genuine leads. Your number
          is never shared.
        </p>

        {stage === 'phone' ? (
          <div className="mt-5 space-y-3">
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
              style={
                {
                  borderColor: 'var(--border)',
                  '--tw-ring-color': 'var(--teal)',
                } as React.CSSProperties
              }
              autoComplete="tel"
              autoFocus
            />
            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={loading || !canSend}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
            >
              {loading ? 'Sending\u2026' : 'Send verification code'}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Enter the 6-digit code sent to {phone}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border px-4 py-3 text-center text-lg font-mono tracking-widest outline-none focus:ring-2"
              style={
                {
                  borderColor: 'var(--border)',
                  '--tw-ring-color': 'var(--teal)',
                } as React.CSSProperties
              }
              autoFocus
            />
            <button
              type="button"
              onClick={() => void handleVerifyOtp()}
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--teal), #0a5a46)' }}
            >
              {loading ? 'Verifying\u2026' : 'Confirm and connect'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage('phone')
                setOtp('')
                setError(null)
              }}
              className="w-full text-sm underline-offset-2 hover:underline"
              style={{ color: 'var(--muted)' }}
            >
              Change number
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full text-sm"
          style={{ color: 'var(--muted)' }}
        >
          Not now
        </button>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
