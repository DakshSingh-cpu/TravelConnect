'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'

type Props = {
  imagePanel: ReactNode
  formPanel: ReactNode
  progressBar: ReactNode
  nav: ReactNode
  mobileImagePanel?: ReactNode
  onEscape?: () => void
}

export default function OnboardingShell({
  imagePanel,
  formPanel,
  progressBar,
  nav,
  mobileImagePanel,
  onEscape,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape()
      }
      // Focus trap: keep focus inside the modal
      if (e.key === 'Tab' && shellRef.current) {
        const focusable = shellRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onEscape],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Auto-focus shell on mount
  useEffect(() => {
    shellRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={shellRef}
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding wizard"
        tabIndex={-1}
        className="flex h-[min(92vh,760px)] w-[min(96vw,1120px)] flex-col overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(28,25,23,0.18)] outline-none"
        style={{ background: 'var(--cream, #FFFDF8)' }}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {imagePanel}

          {mobileImagePanel && (
            <div className="relative h-[28vh] w-full shrink-0 overflow-hidden lg:hidden">
              {mobileImagePanel}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            {progressBar}
            {formPanel}
            {nav}
          </div>
        </div>
      </div>
    </div>
  )
}
