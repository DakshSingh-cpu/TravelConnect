import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows, error } = await supabaseAdmin
    .from('lead_assignments')
    .select('id, vetting_result')
    .not('vetting_result', 'is', null)
    .lt('created_at', cutoff)
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let purged = 0
  for (const row of rows ?? []) {
    const vr = row.vetting_result as Record<string, unknown> | null
    if (!vr) continue
    const sanitized = {
      reasonCodes: vr.reasonCodes ?? [],
      decision: vr.decision ?? null,
      score: vr.score ?? null,
      audit: vr.audit ?? [],
      purgedAt: new Date().toISOString(),
    }
    await supabaseAdmin
      .from('lead_assignments')
      .update({ vetting_result: sanitized })
      .eq('id', row.id)
    purged += 1
  }

  return NextResponse.json({ purged })
}
