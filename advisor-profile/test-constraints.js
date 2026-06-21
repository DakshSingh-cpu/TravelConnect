import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data, error } = await supabase.rpc('query_index_info', {})
  // Actually we can just query pg_indexes if we can execute SQL
  // But maybe we can try to insert status: 'pending' instead to see if it fails
  const { error: err1 } = await supabase
    .from('lead_assignments')
    .insert({
      match_session_id: "51ff03f4-bf2b-4cd8-9826-1e7e0e30d09e", // already has an approved row, so not pending or vetting
      traveller_user_id: "c4519221-f8d9-4eb4-86d7-23ed71269e9f",
      advisor_user_id: "b403598e-a1f8-4cdd-b1c6-9a3a9e4173be",
      advisor_route_id: "agency-888888",
      rank: 2,
      status: 'pending',
    })

  console.log("Insert pending:", err1 ? err1.message : "success")

  const { error: err2 } = await supabase
    .from('lead_assignments')
    .insert({
      match_session_id: "4ef74b6c-b1ac-47ca-829f-8baff20e4b9f", // already has blocked
      traveller_user_id: "c4519221-f8d9-4eb4-86d7-23ed71269e9f",
      advisor_user_id: "b403598e-a1f8-4cdd-b1c6-9a3a9e4173be",
      advisor_route_id: "agency-888888",
      rank: 2,
      status: 'blocked',
    })

  console.log("Insert blocked:", err2 ? err2.message : "success")
}

run()
