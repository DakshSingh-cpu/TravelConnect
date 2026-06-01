import ChatShell from '@/components/chat/ChatShell'

type Props = {
  params: Promise<{ conversationId: string }>
}

export const metadata = {
  title: 'Chat | TravelConnect',
}

export default async function ChatConversationPage({ params }: Props) {
  const { conversationId } = await params
  return <ChatShell activeConversationId={conversationId} />
}
