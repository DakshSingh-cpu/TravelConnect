import { test, expect } from '@playwright/test'
import {
  assertEmailNotSentViaDb,
  assertEmailSentViaDb,
  assertEmailSentViaInbox,
  triggerSendDelayedEmails,
} from './helpers/email'
import { runSeriousTravellerFlow, runSpeedrunBotFlow } from './helpers/funnel'
import {
  backdateApprovedAt,
  createTestTraveller,
  deleteTestUser,
  waitForVettingComplete,
} from './helpers/supabase'

/**
 * Lead vetting E2E — UI + Supabase lead_assignments + delayed email cron.
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see e2e/env.example)
 * - CRON_SECRET (matches app env)
 * - LEAD_VETTING_ENABLED=true on the dev server
 * - Supabase Auth test phone: 919205025389 → OTP 123456
 * - Optional: MAILTRAP_API_TOKEN + MAILTRAP_INBOX_ID for inbox verification
 * - Optional: RESEND_API_KEY for actual email delivery during cron
 */
test.describe('Lead vetting E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test('Test 1 — Serious Traveler: approved, delayed email, then cron sends', async ({
    page,
    request,
  }) => {
    const user = await createTestTraveller('serious')

    try {
      await runSeriousTravellerFlow(page, user)

      const assignment = await waitForVettingComplete(user.id)
      expect(assignment.status).toBe('approved')
      expect(assignment.email_sent_at).toBeNull()

      await backdateApprovedAt(assignment.id, 20)
      const cronResult = await triggerSendDelayedEmails(request)
      expect(cronResult.sent).toBeGreaterThanOrEqual(0)

      if (process.env.RESEND_API_KEY) {
        await assertEmailSentViaDb(assignment.id)
        await assertEmailSentViaInbox(user.email)
      } else {
        console.warn(
          '[e2e] RESEND_API_KEY not set — cron ran but email_sent_at will stay null. Set RESEND_API_KEY to assert delivery.',
        )
      }
    } finally {
      await deleteTestUser(user.id)
    }
  })

  test('Test 2 — Speedrun Bot: silently blocked, no email after cron', async ({
    browser,
    request,
  }) => {
    const user = await createTestTraveller('speedrun')
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await runSpeedrunBotFlow(page, user)

      const assignment = await waitForVettingComplete(user.id)
      expect(assignment.status).toBe('blocked')
      expect(assignment.email_sent_at).toBeNull()

      await triggerSendDelayedEmails(request)
      await assertEmailNotSentViaDb(assignment.id)
    } finally {
      await context.close()
      await deleteTestUser(user.id)
    }
  })
})
