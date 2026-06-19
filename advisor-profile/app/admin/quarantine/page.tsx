import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/isAdmin'
import QuarantineShell from '@/components/admin/QuarantineShell'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const metadata = {
  title: 'Lead Quarantine | TravelConnect Admin',
}

export default async function AdminQuarantinePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('account_role')
    .eq('id', user.id)
    .single()

  if (!isAdminUser({ account_role: profile?.account_role ?? 'traveller', email: user.email })) {
    redirect('/')
  }

  return <QuarantineShell />
}
