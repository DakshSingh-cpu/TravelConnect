'use client'

type Variant = 'loading' | 'empty'

type Props = {
  variant: Variant
}

export default function ClientBriefBanner({ variant }: Props) {
  if (variant === 'loading') {
    return (
      <div
        className="rounded-xl border px-4 py-3 text-center text-xs"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}
        role="status"
        aria-live="polite"
      >
        Loading client brief…
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border px-4 py-3 text-center text-xs leading-relaxed"
      style={{
        borderColor: 'rgba(15,110,86,0.2)',
        background: 'rgba(15,110,86,0.04)',
        color: 'var(--muted)',
      }}
      role="status"
    >
      No trip brief yet — ask your client to complete the AI concierge or share their preferences in chat.
    </div>
  )
}
