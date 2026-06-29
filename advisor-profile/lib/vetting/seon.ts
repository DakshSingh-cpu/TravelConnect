import type { SupabaseClient } from '@supabase/supabase-js'

export type SeonNormalizedResult = {
  fraudScore: number
  emailAgeDays: number | null
  emailDomainType: 'corporate' | 'free' | 'disposable' | 'unknown'
  phoneRiskScore: number | null
  socialProfileCount: number
  ipCountry: string | null
  ipType: 'residential' | 'datacenter' | 'vpn' | 'unknown'
  rawTransactionId: string | null
  fromCache: boolean
}

const SEON_API_URL = process.env.SEON_API_URL ?? 'https://api.seon.io/SeonRestService/fraud-api/v2'

/**
 * Whether to fail OPEN (proceed with no fraud signal) when SEON is unavailable.
 *
 * - `SEON_FAIL_OPEN=true`  → always fail open (explicit opt-in, used by e2e/dev).
 * - `SEON_FAIL_OPEN=false` → always fail closed.
 * - Unset → fail OPEN outside production, but fail CLOSED in production so a SEON
 *   outage routes leads to admin quarantine (via defaultHighRisk → silent block)
 *   instead of silently passing un-vetted leads.
 */
function failOpen(): boolean {
  const flag = process.env.SEON_FAIL_OPEN
  if (flag === 'true') return true
  if (flag === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export async function fetchSeonResult(
  supabaseAdmin: SupabaseClient,
  params: {
    email: string
    phone: string
    ip: string
    userId: string
  },
): Promise<SeonNormalizedResult | null> {
  const cached = await readCache(supabaseAdmin, params.userId)
  if (cached) return { ...cached, fromCache: true }

  const apiKey = process.env.SEON_API_KEY
  if (!apiKey) {
    console.warn('[seon] SEON_API_KEY not set')
    return failOpen() ? null : defaultHighRisk()
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(SEON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        email: params.email,
        phone_number: params.phone,
        ip: params.ip,
        user_id: params.userId,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.error('[seon] HTTP', res.status)
      return failOpen() ? null : defaultHighRisk()
    }

    const json = (await res.json()) as Record<string, unknown>
    const normalized = normalizeSeonResponse(json)
    await writeCache(supabaseAdmin, params.userId, normalized)
    return { ...normalized, fromCache: false }
  } catch (err) {
    console.error('[seon] request failed', err)
    return failOpen() ? null : defaultHighRisk()
  }
}

function defaultHighRisk(): SeonNormalizedResult {
  return {
    fraudScore: 80,
    emailAgeDays: null,
    emailDomainType: 'unknown',
    phoneRiskScore: 80,
    socialProfileCount: 0,
    ipCountry: null,
    ipType: 'unknown',
    rawTransactionId: null,
    fromCache: false,
  }
}

export function normalizeSeonResponse(json: Record<string, unknown>): SeonNormalizedResult {
  const data = (json.data ?? json) as Record<string, unknown>
  const fraudScore = Number(data.fraud_score ?? data.score ?? 0)

  const emailDetails = (data.email_details ?? {}) as Record<string, unknown>
  const phoneDetails = (data.phone_details ?? {}) as Record<string, unknown>
  const ipDetails = (data.ip_details ?? {}) as Record<string, unknown>

  let emailDomainType: SeonNormalizedResult['emailDomainType'] = 'unknown'
  const domainType = String(emailDetails.domain_type ?? emailDetails.type ?? '').toLowerCase()
  if (domainType.includes('disposable')) emailDomainType = 'disposable'
  else if (domainType.includes('corporate') || domainType.includes('company')) emailDomainType = 'corporate'
  else if (domainType.includes('free')) emailDomainType = 'free'

  let ipType: SeonNormalizedResult['ipType'] = 'unknown'
  const ipTypeRaw = String(ipDetails.type ?? ipDetails.ip_type ?? '').toLowerCase()
  if (ipTypeRaw.includes('vpn')) ipType = 'vpn'
  else if (ipTypeRaw.includes('data') || ipTypeRaw.includes('hosting')) ipType = 'datacenter'
  else if (ipTypeRaw.includes('residential') || ipTypeRaw.includes('isp')) ipType = 'residential'

  const socialProfiles = (data.social_media_profiles ?? data.social_profiles ?? []) as unknown[]
  const socialProfileCount = Array.isArray(socialProfiles) ? socialProfiles.length : 0

  return {
    fraudScore: Number.isFinite(fraudScore) ? Math.min(100, Math.max(0, fraudScore)) : 50,
    emailAgeDays:
      typeof emailDetails.account_age_days === 'number'
        ? emailDetails.account_age_days
        : null,
    emailDomainType,
    phoneRiskScore:
      typeof phoneDetails.risk_score === 'number' ? phoneDetails.risk_score : null,
    socialProfileCount,
    ipCountry: typeof ipDetails.country === 'string' ? ipDetails.country : null,
    ipType,
    rawTransactionId: typeof data.id === 'string' ? data.id : null,
    fromCache: false,
  }
}

async function readCache(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<SeonNormalizedResult | null> {
  const { data } = await supabaseAdmin
    .from('seon_cache')
    .select('result, expires_at')
    .eq('traveller_user_id', userId)
    .maybeSingle()

  if (!data) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  return data.result as SeonNormalizedResult
}

async function writeCache(
  supabaseAdmin: SupabaseClient,
  userId: string,
  result: SeonNormalizedResult,
): Promise<void> {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { fraudScore, emailAgeDays, emailDomainType, phoneRiskScore, socialProfileCount, ipCountry, ipType, rawTransactionId } = result
  await supabaseAdmin.from('seon_cache').upsert({
    traveller_user_id: userId,
    result: {
      fraudScore,
      emailAgeDays,
      emailDomainType,
      phoneRiskScore,
      socialProfileCount,
      ipCountry,
      ipType,
      rawTransactionId,
    },
    expires_at: expires,
  })
}
