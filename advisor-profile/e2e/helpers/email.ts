import type { APIRequestContext } from '@playwright/test'
import { BASE_URL, CRON_SECRET } from './constants'
import { createAdminClient } from './supabase'

type MailtrapMessage = {
  id: number
  subject: string
  to_email: string
  sent_at: string
}

/**
 * Optional: verify delivery via Mailtrap inbox API.
 *
 * Setup:
 * 1. Create a Mailtrap inbox → copy Inbox ID.
 * 2. Set MAILTRAP_API_TOKEN and MAILTRAP_INBOX_ID in .env.test (see e2e/env.example).
 * 3. Point Resend `to` at your Mailtrap inbox address, OR use a test user email
 *    that forwards to Mailtrap (depending on your Resend sandbox config).
 *
 * Ethereal alternative:
 * - npm install nodemailer
 * - const testAccount = await nodemailer.createTestAccount()
 * - Use testAccount.user as the traveller signup email
 * - After cron: nodemailer.getTestMessageUrl(sentMessage) or poll Ethereal IMAP API
 */
export async function fetchLatestMailtrapMessage(
  recipientEmail: string,
): Promise<MailtrapMessage | null> {
  const token = process.env.MAILTRAP_API_TOKEN
  const inboxId = process.env.MAILTRAP_INBOX_ID
  if (!token || !inboxId) return null

  const res = await fetch(
    `https://mailtrap.io/api/v1/inboxes/${inboxId}/messages?search=${encodeURIComponent(recipientEmail)}`,
    { headers: { 'Api-Token': token } },
  )
  if (!res.ok) {
    console.warn('[e2e/email] Mailtrap fetch failed:', res.status, await res.text())
    return null
  }

  const messages = (await res.json()) as MailtrapMessage[]
  if (!messages.length) return null
  return messages.sort((a, b) => b.id - a.id)[0] ?? null
}

export async function assertEmailSentViaInbox(
  recipientEmail: string,
  expectedSubjectFragment = 'TravelConnect chat is ready',
): Promise<void> {
  const msg = await fetchLatestMailtrapMessage(recipientEmail)
  if (!msg) {
    console.warn(
      '[e2e/email] Mailtrap not configured or no message found — rely on DB email_sent_at assertion.',
    )
    return
  }
  if (!msg.subject.includes(expectedSubjectFragment)) {
    throw new Error(
      `Expected email subject containing "${expectedSubjectFragment}", got "${msg.subject}"`,
    )
  }
}

/** Primary fallback: email_sent_at populated on lead_assignments. */
export async function assertEmailSentViaDb(assignmentId: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('lead_assignments')
    .select('email_sent_at')
    .eq('id', assignmentId)
    .single()

  if (error) throw new Error(error.message)
  if (!data?.email_sent_at) {
    throw new Error(`email_sent_at is still null for assignment ${assignmentId}`)
  }
}

export async function assertEmailNotSentViaDb(assignmentId: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('lead_assignments')
    .select('email_sent_at, status')
    .eq('id', assignmentId)
    .single()

  if (error) throw new Error(error.message)
  if (data?.email_sent_at) {
    throw new Error(`Expected no email for blocked lead, but email_sent_at=${data.email_sent_at}`)
  }
}

export async function triggerSendDelayedEmails(request: APIRequestContext): Promise<{ sent: number }> {
  if (!CRON_SECRET) {
    throw new Error('CRON_SECRET is required to invoke /api/cron/send-delayed-emails')
  }

  const res = await request.post(`${BASE_URL}/api/cron/send-delayed-emails`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })

  if (!res.ok()) {
    throw new Error(`Cron failed: ${res.status()} ${await res.text()}`)
  }

  return (await res.json()) as { sent: number }
}
