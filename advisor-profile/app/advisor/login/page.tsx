import { Suspense } from 'react'
import SignInCard from '@/components/auth/SignInCard'

export const metadata = {
  title: 'Advisor sign in | TravelConnect',
  description: 'Sign in to access your advisor inbox and manage client conversations.',
}

export default function AdvisorLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f4]">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <SignInCard
        accountRole="advisor"
        heading="Advisor sign in"
        subheading="Sign in to access your advisor inbox and manage client conversations."
        inputClassName="bg-white"
        alternateLoginHref="/login"
        alternateLoginLabel="Traveller sign in →"
      />
    </Suspense>
  )
}
