'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SignInCard from '@/components/auth/SignInCard'

const DEFAULT_AGENCY_NAME =
  process.env.NEXT_PUBLIC_DEFAULT_AGENCY_NAME?.trim() || 'AEROTOUR'

function TravellerLoginInner() {
  const searchParams = useSearchParams()
  const agencyName = searchParams.get('agency')?.trim() || DEFAULT_AGENCY_NAME

  return (
    <SignInCard
      accountRole="traveller"
      heading={
        <>
          Chat with <span className="uppercase tracking-wide">{agencyName}</span>
        </>
      }
      subheading="Sign in to send a message to your advisor."
      inputClassName="bg-[#edf2f7]"
      alternateLoginHref="/advisor/login"
      alternateLoginLabel="Travel Advisor sign in →"
    />
  )
}

export default function TravellerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f4]">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <TravellerLoginInner />
    </Suspense>
  )
}
