import AdvisorJsonLd from '@/components/seo/AdvisorJsonLd'
import AdvisorProfileStub from '@/components/advisor/AdvisorProfileStub'
import AdvisorProfileWithData from '@/components/advisor/AdvisorProfileWithData'
import { getAdvisorById } from '@/lib/advisorsDirectory'
import {
  buildMockMatchedAdvisors,
  defaultIntakePayload,
  parseAgencyIdFromAdvisorRoute,
  type MatchedAdvisor,
} from '@/lib/matchAdvisors'
type Props = {
  params: Promise<{ advisorId: string }>
}

export default async function AdvisorDynamicPage({ params }: Props) {
  const { advisorId } = await params
  const directoryEntry = getAdvisorById(advisorId)

  const legacyMatch = buildMockMatchedAdvisors(defaultIntakePayload()).find((m) => m.id === advisorId)
  if (legacyMatch) {
    return (
      <>
        <AdvisorJsonLd advisorId={advisorId} />
        <AdvisorProfileWithData persona={legacyMatch} csvAgencyId={legacyMatch.csvAgencyId} />
      </>
    )
  }

  const csvAgencyId = parseAgencyIdFromAdvisorRoute(advisorId)
  if (csvAgencyId) {
    const persona: MatchedAdvisor = {
      id: advisorId,
      name: 'Travel Advisor',
      title: 'TravelConnect Verified Partner',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
      matchScore: 88,
      llmContext: 'Verified TravelConnect travel partner.',
      csvAgencyId,
    }
    return (
      <>
        <AdvisorJsonLd advisorId={advisorId} />
        <AdvisorProfileWithData persona={persona} csvAgencyId={csvAgencyId} />
      </>
    )
  }

  return (
    <>
      <AdvisorJsonLd advisorId={advisorId} />
      <AdvisorProfileStub advisorId={advisorId} displayName={directoryEntry?.name} />
    </>
  )
}
