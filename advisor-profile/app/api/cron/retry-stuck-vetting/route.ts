import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runLeadVetting } from '@/lib/vetting/runLeadVetting'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString()

  const { data: stuck, error } = await supabaseAdmin
    .from('lead_assignments')
    .select('id, traveller_user_id')
    .eq('status', 'vetting')
    .lt('created_at', cutoff)
    .lt('vetting_attempts', 5)
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let processed = 0
  for (const row of stuck ?? []) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.traveller_user_id)
    await runLeadVetting(supabaseAdmin, row.id, {
      email: authUser?.user?.email ?? '',
      phone: authUser?.user?.phone ?? '',
      userId: row.traveller_user_id,
    })
    processed += 1
  }

  return NextResponse.json({ processed })
}
