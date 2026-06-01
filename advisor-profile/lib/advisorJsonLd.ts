import { advisor, reviews } from '@/lib/data'
import { getAdvisorById, type DirectoryAdvisor } from '@/lib/advisorsDirectory'
import { getSiteUrl } from '@/lib/siteUrl'

type ReviewInput = { name: string; quote: string; stars: number; tripContext?: string }

function mapReviews(reviewList: ReviewInput[], advisorName: string) {
  return reviewList.map((r) => ({
    '@type': 'Review' as const,
    author: { '@type': 'Person' as const, name: r.name },
    reviewRating: {
      '@type': 'Rating' as const,
      ratingValue: r.stars,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: r.quote,
    itemReviewed: {
      '@type': 'TravelAgency' as const,
      name: advisorName,
    },
    ...(r.tripContext ? { name: r.tripContext } : {}),
  }))
}

function aggregateRating(profile: DirectoryAdvisor) {
  return {
    '@type': 'AggregateRating' as const,
    ratingValue: profile.rating,
    reviewCount: profile.reviewCount,
    bestRating: 5,
    worstRating: 1,
  }
}

/** Person schema — primary identity for the advisor. */
export function buildAdvisorPersonNode(profile: DirectoryAdvisor, reviewList: ReviewInput[]) {
  const base = getSiteUrl()
  const profileUrl = `${base}${profile.profilePath}`

  return {
    '@type': 'Person' as const,
    '@id': `${profileUrl}#person`,
    name: profile.name,
    jobTitle: profile.title,
    description: profile.bio,
    url: profileUrl,
    image: profile.photoUrl,
    worksFor: {
      '@type': 'Organization' as const,
      name: 'TravelConnect',
      url: base,
    },
    address: {
      '@type': 'PostalAddress' as const,
      addressLocality: profile.location,
    },
    knowsAbout: profile.specialisations,
  }
}

/** TravelAgency (LocalBusiness) — how crawlers classify the advisory practice. */
export function buildAdvisorLocalBusinessNode(
  profile: DirectoryAdvisor,
  reviewList: ReviewInput[],
) {
  const base = getSiteUrl()
  const profileUrl = `${base}${profile.profilePath}`

  return {
    '@type': 'TravelAgency' as const,
    '@id': `${profileUrl}#business`,
    name: `${profile.name} — ${profile.title}`,
    description: profile.bio,
    url: profileUrl,
    image: profile.photoUrl,
    address: {
      '@type': 'PostalAddress' as const,
      addressLocality: profile.location,
      addressCountry: 'IN',
    },
    areaServed: profile.specialisations,
    parentOrganization: {
      '@type': 'Organization' as const,
      name: 'TravelConnect',
      url: base,
    },
    employee: {
      '@type': 'Person' as const,
      '@id': `${profileUrl}#person`,
      name: profile.name,
      jobTitle: profile.title,
    },
    aggregateRating: aggregateRating(profile),
    review: mapReviews(reviewList, profile.name),
  }
}

/** Combined @graph with Person + LocalBusiness (TravelAgency) for rich AI/crawler parsing. */
export function buildAdvisorStructuredData(
  profile: DirectoryAdvisor,
  reviewList: ReviewInput[],
) {
  const base = getSiteUrl()
  const profileUrl = `${base}${profile.profilePath}`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildAdvisorPersonNode(profile, reviewList),
      buildAdvisorLocalBusinessNode(profile, reviewList),
    ],
    url: profileUrl,
  }
}

export function buildPriyaRajanJsonLd() {
  const profile = getAdvisorById('priya-rajan')!
  const reviewList = reviews.map((r) => ({
    name: r.name,
    quote: r.quote,
    stars: r.stars,
    tripContext: r.tripContext,
  }))
  return buildAdvisorStructuredData(profile, reviewList)
}

export function buildJsonLdForAdvisorId(advisorId: string) {
  const profile = getAdvisorById(advisorId)
  if (!profile) return null

  if (advisorId === 'priya-rajan') {
    return buildPriyaRajanJsonLd()
  }

  return buildAdvisorStructuredData(profile, [
    {
      name: 'Verified TravelConnect traveler',
      quote: `Highly rated ${profile.name} for ${profile.specialisations[0] ?? 'luxury travel'} planning.`,
      stars: Math.round(profile.rating),
      tripContext: profile.title,
    },
  ])
}

export { advisor as priyaAdvisorData }
