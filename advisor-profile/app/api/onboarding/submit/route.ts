import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { onboardingPayloadSchema } from '@/lib/onboarding/schema'
import { mapToMatchIntake, buildSyntheticBrief } from '@/lib/onboarding/mapToMatchIntake'
import { insertMatchSession } from '@/lib/matchSessions/insertSession'
import type { Attribution } from '@/lib/attribution'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { attachReadinessSignature } from '@/lib/vetting/readinessSignature'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type SubmitBody = {
  payload: unknown
  attribution?: Attribution | null
  idempotencyKey?: string
  // Honeypot: a hidden form field that real users never fill. Any non-empty
  // value indicates an automated submission.
  hp?: unknown
}

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(
    request,
    'onboarding-submit',
    '/api/onboarding/submit',
  )
  if (rateLimited) return rateLimited

  let body: SubmitBody
  try {
    body = (await request.json()) as SubmitBody
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  // Honeypot trap: silently reject bot submissions that fill the hidden field.
  if (typeof body.hp === 'string' && body.hp.trim().length > 0) {
    console.warn('[onboarding/submit] honeypot triggered — rejecting submission')
    return NextResponse.json({ ok: false, error: 'Invalid submission' }, { status: 400 })
  }

  const parsed = onboardingPayloadSchema.safeParse(body.payload)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      {
        ok: false,
        error: firstIssue?.message ?? 'Invalid onboarding payload',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 422 },
    )
  }

  const onboardingPayload = parsed.data
  const matchIntake = mapToMatchIntake(onboardingPayload)
  // Sign the server-built synthetic brief so readiness binding (when enabled)
  // trusts it rather than capping this legitimate, server-generated score.
  const syntheticBrief = attachReadinessSignature(buildSyntheticBrief(onboardingPayload))

  const sessionResult = await insertMatchSession(supabaseAdmin, {
    intake: matchIntake,
    advisorIds: [],
    advisorBrief: syntheticBrief,
    attribution: body.attribution,
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : null,
  })

  if (!sessionResult) {
    return NextResponse.json(
      { ok: false, error: 'Failed to create match session' },
      { status: 500 },
    )
  }

  // Store extended onboarding fields on the match session row
  const { error: updateError } = await supabaseAdmin
    .from('match_sessions')
    .update({
      onboarding_payload: onboardingPayload,
      contact_name: onboardingPayload.contact?.name,
      contact_email: onboardingPayload.contact?.email,
      contact_phone: onboardingPayload.contact?.phone,
      self_reported_source: onboardingPayload.attribution,
    })
    .eq('id', sessionResult.id)

  if (updateError) {
    console.error(
      '[onboarding/submit] Failed to update extended fields:',
      updateError.message,
    )
  }

  return NextResponse.json({
    ok: true,
    matchSessionId: sessionResult.id,
    intake: matchIntake,
    readinessTier: sessionResult.readinessTier,
  })
}
