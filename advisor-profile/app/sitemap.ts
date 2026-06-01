import type { MetadataRoute } from 'next'
import { advisorsDirectory } from '@/lib/advisorsDirectory'
import { getSiteUrl } from '@/lib/siteUrl'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const now = new Date()

  const advisorRoutes: MetadataRoute.Sitemap = advisorsDirectory.map((a) => ({
    url: `${base}${a.profilePath}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: a.hasFullProfile ? 0.9 : 0.7,
  }))

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/advisors`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    ...advisorRoutes,
  ]
}
