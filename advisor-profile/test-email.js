import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers()
  if (uErr) console.error(uErr)
  
  const user = users?.users.find(u => u.email === 'nivas94020@doreact.com')
  console.log("Found user?", user ? user.id : 'No')

  const { data: links, error: lErr } = await supabase
    .from('advisor_user_links')
    .select('*')
  
  if (lErr) console.error(lErr)
  else console.log("Links:", links.filter(l => l.user_id === user?.id))
}

run()
