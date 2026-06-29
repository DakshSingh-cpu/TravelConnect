import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/guardrails/rateLimit'
import { resolveIsAdmin } from '@/lib/admin/isAdmin'
import { adminOverrideLead } from '@/lib/vetting/adminOverrideLead'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(request, 'admin-override', '/api/admin/override-lead')
  if (rateLimited) return rateLimited

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await resolveIsAdmin(supabaseAdmin, user.id))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  let body: { assignmentId?: string }
  try {
    body = (await request.json()) as { assignmentId?: string }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.assignmentId) {
    return NextResponse.json({ ok: false, error: 'assignmentId required' }, { status: 400 })
  }

  try {
    const result = await adminOverrideLead(supabaseAdmin, body.assignmentId, user.id)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Override failed' },
      { status: 500 },
    )
  }
}
