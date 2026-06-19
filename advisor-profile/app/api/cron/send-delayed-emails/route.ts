import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailDelayMinutes } from '@/lib/featureFlags'
import { sendTravelerAcceptedEmail } from '@/lib/email/resend'
import { getSiteUrl } from '@/lib/siteUrl'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const delayMin = emailDelayMinutes()
  const cutoff = new Date(Date.now() - delayMin * 60 * 1000).toISOString()

  const { data: rows, error } = await supabaseAdmin
    .from('lead_assignments')
    .select('id, conversation_id, traveller_user_id, advisor_route_id, match_session_id')
    .eq('status', 'approved')
    .is('email_sent_at', null)
    .lt('approved_at', cutoff)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0

  for (const row of rows ?? []) {
    if (!row.conversation_id) continue

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(row.traveller_user_id)
    if (!user?.user?.email) continue

    let destination: string | null = null
    if (row.match_session_id) {
      const { data: session } = await supabaseAdmin
        .from('match_sessions')
        .select('destination')
        .eq('id', row.match_session_id)
        .single()
      destination = session?.destination ?? null
    }

    const advisorName = row.advisor_route_id.replace(/^agency-/, 'Advisor #')
    const chatUrl = `${getSiteUrl()}/chat/${row.conversation_id}`

    try {
      await sendTravelerAcceptedEmail({
        to: user.user.email,
        advisorName,
        destination,
        chatUrl,
      })
    } catch (err) {
      console.error('[send-delayed-emails] failed', row.id, err)
      continue
    }

    const now = new Date().toISOString()
    const { data: updated } = await supabaseAdmin
      .from('lead_assignments')
      .update({ email_sent_at: now, chat_unlocked_at: now })
      .eq('id', row.id)
      .is('email_sent_at', null)
      .select('id')

    if (updated?.length) sent += 1
  }

  return NextResponse.json({ sent })
}
