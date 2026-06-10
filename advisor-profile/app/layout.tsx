import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import GlobalHeader from '@/components/GlobalHeader'

export const metadata: Metadata = {
  title: 'Find Your Travel Advisor | TravelConnect',
  description:
    'Get matched with a verified TravelConnect travel advisor in a few steps. High-confidence matching powered by real booking data.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="h-dvh flex flex-col overflow-hidden" style={{ background: 'var(--cream)', color: 'var(--ink)' }}>
        <ThemeProvider>
          <GlobalHeader />
          <div className="flex-1 flex flex-col relative min-h-0 overflow-y-auto">
            {children}
          </div>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  )
}
