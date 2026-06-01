import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Priya Rajan — Europe Travel Specialist | TBO Tek',
  description:
    '94% match. 127 TBO-verified bookings. 4.9 stars. Priya Rajan is your expert for luxury family Europe travel. View her verified trip history and booking record.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-cream min-h-screen">{children}</body>
    </html>
  )
}
