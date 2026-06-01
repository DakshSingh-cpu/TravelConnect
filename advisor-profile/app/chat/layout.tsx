import { Suspense } from 'react'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center" style={{ background: 'var(--cream)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading…
          </p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
