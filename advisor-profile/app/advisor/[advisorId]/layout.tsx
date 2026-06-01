import type { Metadata } from 'next'
import { getAdvisorById } from '@/lib/advisorsDirectory'

type Props = {
  children: React.ReactNode
  params: Promise<{ advisorId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { advisorId } = await params
  const profile = getAdvisorById(advisorId)
  if (!profile) {
    return { title: 'Advisor Profile | TravelConnect' }
  }
  return {
    title: `${profile.name} — ${profile.title} | TravelConnect`,
    description: profile.bio.slice(0, 160),
  }
}

export default function AdvisorIdLayout({ children }: Props) {
  return children
}
