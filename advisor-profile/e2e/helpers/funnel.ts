import type { Page } from '@playwright/test'
import {
  BASE_URL,
  MOCK_OTP,
  MOCK_PHONE,
  SERIOUS_CONCIERGE_MESSAGES,
  SPEEDRUN_PASTE_PARAGRAPH,
  TEST_RESIDENTIAL_ZIP,
  WAIT_SCREEN_TEXT,
} from './constants'
import type { TestUser } from './supabase'

const PHONE_DISPLAY = MOCK_PHONE.length === 12 ? MOCK_PHONE.slice(2) : MOCK_PHONE

export async function startTravellerFunnel(page: Page): Promise<void> {
  await page.goto('/')
  await page.locator('#role-traveller-btn').click()

  const freshStart = page.locator('#traveller-fresh-start-btn')
  if (await freshStart.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await freshStart.click()
  }
}

export async function completeDestinationStep(
  page: Page,
  destinationId = 'destination-japan',
  dwellMs = 5_000,
): Promise<void> {
  await page.locator(`#${destinationId}`).click()
  await page.waitForTimeout(dwellMs)
  await page.locator('#destination-continue').click()
}

export async function completePreferencesStep(
  page: Page,
  dwellMs = 5_000,
): Promise<void> {
  await page.locator('#travel-style-couple').click()
  await page.waitForTimeout(dwellMs)
  await page.locator('#preferences-continue').click()
}

export async function completeConciergeSerious(page: Page): Promise<void> {
  await page.locator('#concierge-title').waitFor({ timeout: 30_000 })

  for (const message of SERIOUS_CONCIERGE_MESSAGES) {
    const input = page.locator('#concierge-input')
    await input.click()
    await page.keyboard.type(message, { delay: 90 })
    await page.locator('form:has(#concierge-input) button[type="submit"]').click()
    await page.waitForTimeout(2_500)
    await waitForConciergeReply(page)
  }
}

export async function completeConciergeSpeedrun(page: Page): Promise<void> {
  await page.locator('#concierge-title').waitFor({ timeout: 15_000 })

  const input = page.locator('#concierge-input')
  const sendBtn = page.locator('form:has(#concierge-input) button[type="submit"]')

  await input.focus()
  await input.evaluate((el, text) => {
    const textarea = el as HTMLTextAreaElement
    textarea.value = text
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('paste', { bubbles: true }))
  }, SPEEDRUN_PASTE_PARAGRAPH)
  await sendBtn.click()

  const quickReplies = ['ok', 'sure', 'yes']
  for (const reply of quickReplies) {
    await input.fill(reply)
    await sendBtn.click()
  }

  await page.getByRole('button', { name: /Connect to Advisor/i }).click()
  await page.getByText('Transferring to your expert').waitFor({ timeout: 90_000 }).catch(() => {})
}

async function waitForConciergeReply(page: Page): Promise<void> {
  await page
    .locator('article:has-text("TravelConnect")')
    .or(page.locator('.animate-pulse'))
    .first()
    .waitFor({ state: 'visible', timeout: 60_000 })
    .catch(() => {})
  await page.waitForTimeout(1_500)
}

export async function waitForMatchResults(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /Chat with/i })
    .first()
    .waitFor({ timeout: 180_000 })
}

export async function signInViaAuthModal(page: Page, user: TestUser): Promise<void> {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Email').fill(user.email)
  await dialog.getByLabel('Password').fill(user.password)
  await dialog.getByRole('button', { name: /^Sign in$/i }).click()
  await dialog.waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

async function grantTestGeolocation(page: Page): Promise<void> {
  await page.context().grantPermissions(['geolocation'], { origin: BASE_URL })
  await page.context().setGeolocation({ latitude: 28.6139, longitude: 77.2090 })

  await page.route('**/reverse-geocode-client**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        countryCode: 'IN',
        countryName: 'India',
        postcode: TEST_RESIDENTIAL_ZIP,
      }),
    })
  })
}

export async function completePhoneOtpAndLocation(page: Page): Promise<void> {
  await grantTestGeolocation(page)

  await page.getByRole('heading', { name: /Verify your number/i }).waitFor({ timeout: 30_000 })

  await page.getByPlaceholder('+91 98765 43210').fill(PHONE_DISPLAY)
  await page.getByRole('button', { name: /Send verification code/i }).click()

  await page.getByPlaceholder('123456').fill(MOCK_OTP)
  await page.getByRole('button', { name: /^Continue$/i }).click()

  await page
    .getByRole('heading', { name: /Verify your number/i })
    .waitFor({ state: 'hidden', timeout: 30_000 })
}

export async function requestChatWithFirstAdvisor(page: Page, user: TestUser): Promise<void> {
  await page.getByRole('button', { name: /Chat with/i }).first().click()

  const authEmail = page.getByLabel('Email')
  if (await authEmail.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await signInViaAuthModal(page, user)
  }

  await completePhoneOtpAndLocation(page)
}

export async function assertWaitScreenVisible(page: Page): Promise<void> {
  await page.getByText(WAIT_SCREEN_TEXT).waitFor({ timeout: 30_000 })
}

/** Full serious-traveller path from home → wait screen. */
export async function runSeriousTravellerFlow(page: Page, user: TestUser): Promise<void> {
  await startTravellerFunnel(page)
  await completeDestinationStep(page, 'destination-japan', 5_000)
  await completePreferencesStep(page, 5_000)
  await page.waitForTimeout(5_000)
  await completeConciergeSerious(page)
  await waitForMatchResults(page)
  await requestChatWithFirstAdvisor(page, user)
  await assertWaitScreenVisible(page)
}

/** Full speedrun-bot path from home → wait screen. */
export async function runSpeedrunBotFlow(page: Page, user: TestUser): Promise<void> {
  await startTravellerFunnel(page)
  await completeDestinationStep(page, 'destination-europe', 0)
  await completePreferencesStep(page, 0)
  await completeConciergeSpeedrun(page)
  await waitForMatchResults(page)
  await requestChatWithFirstAdvisor(page, user)
  await assertWaitScreenVisible(page)
}
