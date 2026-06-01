import { buildJsonLdForAdvisorId } from '@/lib/advisorJsonLd'

type Props = {
  advisorId: string
}

export default function AdvisorJsonLd({ advisorId }: Props) {
  const schema = buildJsonLdForAdvisorId(advisorId)
  if (!schema) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
