import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/isAdmin'
import { fetchQuarantineLeads } from '@/lib/admin/fetchQuarantineLeads'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('account_role')
    .eq('id', user.id)
    .single()

  if (!isAdminUser({ account_role: profile?.account_role ?? 'traveller', email: user.email })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const dismissed = url.searchParams.get('dismissed') === 'true'
  const leads = await fetchQuarantineLeads(dismissed)

  return NextResponse.json({ leads })
}
