const ATTRIBUTION_STORAGE_KEY = 'tbo_attribution'

export type Attribution = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  fbclid?: string
  landed_at: string
}

/**
 * Parse UTM and Meta click-id params from the current URL and persist to sessionStorage.
 * Only writes once per session (first landing wins).
 */
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null

  const existing = readAttribution()
  if (existing) return existing

  const params = new URLSearchParams(window.location.search)
  const utm_source = params.get('utm_source') ?? undefined
  const utm_medium = params.get('utm_medium') ?? undefined
  const utm_campaign = params.get('utm_campaign') ?? undefined
  const utm_content = params.get('utm_content') ?? undefined
  const fbclid = params.get('fbclid') ?? undefined

  const hasAny = utm_source || utm_medium || utm_campaign || utm_content || fbclid
  if (!hasAny) return null

  const attribution: Attribution = {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    fbclid,
    landed_at: new Date().toISOString(),
  }

  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    /* quota / private mode */
  }

  return attribution
}

export function readAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Attribution
  } catch {
    return null
  }
}
