import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const matchSessionId = "51ff03f4-bf2b-4cd8-9826-1e7e0e30d09e" // from the last log
  const travellerUserId = "c4519221-f8d9-4eb4-86d7-23ed71269e9f"
  const advisorUserId = "b403598e-a1f8-4cdd-b1c6-9a3a9e4173be" // random existing or correct
  const advisorRouteId = "agency-999999" // a new one

  const { data, error } = await supabase
    .from('lead_assignments')
    .insert({
      match_session_id: matchSessionId,
      traveller_user_id: travellerUserId,
      advisor_user_id: advisorUserId,
      advisor_route_id: advisorRouteId,
      rank: 2,
      status: 'vetting',
    })
    .select('id')
    .single()
  
  if (error) {
    console.error("INSERT ERROR:")
    console.error(error)
  } else {
    console.log("INSERT SUCCESS:")
    console.log(data)
  }
}

run()
