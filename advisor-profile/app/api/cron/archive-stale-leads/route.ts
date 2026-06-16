import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ghostArchiveCutoffIso } from '@/lib/guardrails/ghostPrevention'

/*
 * POST /api/cron/archive-stale-leads
 *
 * Scheduled via Vercel Cron (see vercel.json). Vercel sends
 * Authorization: Bearer <CRON_SECRET> automatically when the
 * CRON_SECRET env var is set in the project settings.
 *
 * Local testing:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     http://localhost:3000/api/cron/archive-stale-leads
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[archive-stale-leads] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = ghostArchiveCutoffIso()

  const { data: staleConversations, error: queryError } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('status', 'active')
    .not('first_advisor_message_at', 'is', null)
    .is('traveller_replied_after_advisor', null)
    .lt('first_advisor_message_at', cutoff)

  if (queryError) {
    console.error('[archive-stale-leads] Query error:', queryError.message)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!staleConversations?.length) {
    console.info('[archive-stale-leads] No stale conversations found')
    return NextResponse.json({ archived: 0 })
  }

  const ids = staleConversations.map((c) => c.id)

  const { error: updateError } = await supabaseAdmin
    .from('conversations')
    .update({ status: 'archived' })
    .in('id', ids)

  if (updateError) {
    console.error('[archive-stale-leads] Update error:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  console.info(`[archive-stale-leads] Archived ${ids.length} stale conversations`)
  return NextResponse.json({ archived: ids.length })
}
