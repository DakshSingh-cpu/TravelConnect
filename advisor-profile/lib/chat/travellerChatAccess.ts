import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function canTravellerAccessConversation(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('chat_unlocked_at, traveller_user_id')
    .eq('conversation_id', conversationId)
    .eq('traveller_user_id', userId)
    .maybeSingle()

  if (!assignment) return true

  return assignment.chat_unlocked_at !== null
}
