import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

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
      <body suppressHydrationWarning className="min-h-screen" style={{ background: 'var(--cream)', color: 'var(--ink)' }}>
        <ThemeProvider>
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  )
}
