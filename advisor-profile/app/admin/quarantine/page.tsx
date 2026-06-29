import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { resolveIsAdmin } from '@/lib/admin/isAdmin'
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

  if (!(await resolveIsAdmin(supabaseAdmin, user.id))) {
    redirect('/')
  }

  return <QuarantineShell />
}
