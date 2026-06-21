/** When true, use background vetting instead of advisor double opt-in. */
export function isLeadVettingEnabled(): boolean {
  return process.env.LEAD_VETTING_ENABLED !== 'false'
}

export function emailDelayMinutes(): number {
  const n = Number(process.env.EMAIL_DELAY_MINUTES ?? '15')
  return Number.isFinite(n) && n > 0 ? n : 15
}

export function adminOverrideEmailImmediate(): boolean {
  return process.env.ADMIN_OVERRIDE_EMAIL_IMMEDIATE === 'true'
}
