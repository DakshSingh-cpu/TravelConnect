import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { isAdminUser } from '@/lib/admin/isAdmin'
import { adminDismissLead } from '@/lib/vetting/adminDismissLead'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, 'admin-override', '/api/admin/dismiss-lead')
  if (rateLimited) return rateLimited

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('account_role')
    .eq('id', user.id)
    .single()

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)

  if (!isAdminUser({ account_role: profile?.account_role ?? 'traveller', email: authUser?.user?.email })) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  let body: { assignmentId?: string; reason?: string }
  try {
    body = (await request.json()) as { assignmentId?: string; reason?: string }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.assignmentId) {
    return NextResponse.json({ ok: false, error: 'assignmentId required' }, { status: 400 })
  }

  try {
    await adminDismissLead(supabaseAdmin, body.assignmentId, user.id, body.reason)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Dismiss failed' },
      { status: 500 },
    )
  }
}
