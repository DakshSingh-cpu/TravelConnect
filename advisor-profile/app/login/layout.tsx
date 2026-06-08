import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in | TravelConnect',
  description: 'Sign in to send a message to your advisor.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
