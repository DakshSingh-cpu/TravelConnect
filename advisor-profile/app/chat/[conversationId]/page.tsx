import ChatShell from '@/components/chat/ChatShell'
import TravellerChatLocked from '@/components/chat/TravellerChatLocked'
import { canTravellerAccessConversation } from '@/lib/chat/travellerChatAccess'
import { createClient as createServerClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ conversationId: string }>
}

export const metadata = {
  title: 'Chat | TravelConnect',
}

export default async function ChatConversationPage({ params }: Props) {
  const { conversationId } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('account_role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.account_role !== 'advisor') {
      const allowed = await canTravellerAccessConversation(user.id, conversationId)
      if (!allowed) {
        return <TravellerChatLocked />
      }
    }
  }

  return <ChatShell activeConversationId={conversationId} />
}
