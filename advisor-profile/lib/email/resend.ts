import { Resend } from 'resend'

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — email sending disabled')
    return null
  }
  return new Resend(apiKey)
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'TravelConnect <noreply@travelconnect.com>'
}

type AcceptedEmailParams = {
  to: string
  advisorName: string
  destination: string | null
  chatUrl: string
}

export async function sendTravelerAcceptedEmail({
  to,
  advisorName,
  destination,
  chatUrl,
}: AcceptedEmailParams): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const dest = destination?.trim() || 'your destination'
  const subject = 'Your TravelConnect chat is ready'

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 16px;">You're verified!</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 8px;">
          Your trip request for <strong>${dest}</strong> has been verified. <strong>${advisorName}</strong>
          is ready to help you plan.
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 24px;">
          Click below to open your secure chat room and start the conversation.
        </p>
        <a href="${chatUrl}"
           style="display: inline-block; background: #0f6e56; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600;">
          Open Chat Room
        </a>
        <p style="font-size: 12px; color: #888; margin-top: 32px; line-height: 1.5;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('[email] sendTravelerAcceptedEmail failed:', error)
    throw new Error(error.message)
  }

  console.info('[email] Chat-ready email sent to', to)
}

type ExpiredEmailParams = {
  to: string
  destination: string | null
}

export async function sendLeadExpiredEmail({
  to,
  destination,
}: ExpiredEmailParams): Promise<void> {
  const resend = getResendClient()
  if (!resend) return

  const dest = destination?.trim() || 'your destination'
  const subject = 'Your TravelConnect advisor request has expired'

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 16px;">Request update</h1>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 8px;">
          Unfortunately, all matched advisors for your trip to <strong>${dest}</strong>
          were unable to respond within the 24-hour window.
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 24px;">
          You can try matching again from the TravelConnect homepage to find available advisors.
        </p>
        <p style="font-size: 12px; color: #888; margin-top: 32px; line-height: 1.5;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('[email] sendLeadExpiredEmail failed:', error)
    throw new Error(error.message)
  }

  console.info('[email] Expiration email sent to', to)
}
