import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find Your Perfect Travel Advisor | TravelConnect',
  description:
    'Answer 3 quick questions, chat with our AI concierge, and get matched with a verified luxury travel advisor — all in under 2 minutes.',
  openGraph: {
    title: 'Find Your Perfect Travel Advisor',
    description:
      'Answer 3 quick questions, chat with our AI concierge, and get matched with a verified luxury travel advisor.',
    type: 'website',
  },
}

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
