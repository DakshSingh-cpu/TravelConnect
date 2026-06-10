/**
 * Send push notifications via Expo's Push API.
 * Used server-side only (API routes with service-role access to push_tokens).
 */

export type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default' | null
  priority?: 'default' | 'normal' | 'high'
}

type ExpoPushTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

/** Chunk messages to stay within Expo batch limits. */
const BATCH_SIZE = 100

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[],
): Promise<{ sent: number; failed: number }> {
  if (messages.length === 0) {
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      if (!res.ok) {
        console.error('[expo-push] HTTP error', res.status)
        failed += batch.length
        continue
      }

      const tickets = (await res.json()) as { data?: ExpoPushTicket[] }
      const results = tickets.data ?? []

      for (const ticket of results) {
        if (ticket.status === 'ok') {
          sent += 1
        } else {
          failed += 1
          console.error('[expo-push] ticket error', ticket.message, ticket.details)
        }
      }
    } catch (err) {
      console.error('[expo-push] batch failed', err)
      failed += batch.length
    }
  }

  return { sent, failed }
}
