import ChatShell from '@/components/chat/ChatShell'

export const metadata = {
  title: 'Messages | TravelConnect',
}

export default function ChatIndexPage() {
  return <ChatShell activeConversationId={null} />
}
