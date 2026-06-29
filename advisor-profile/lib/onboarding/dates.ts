/**
 * Returns the traveller's current local date as a `YYYY-MM-DD` string.
 *
 * Uses the client's local timezone (not UTC) so the value matches what an
 * `<input type="date">` produces and what the native picker shows. Using
 * `toISOString()` directly would shift to UTC and can be off by a day for
 * travellers browsing from non-UTC timezones.
 */
export function todayLocalISO(): string {
  const now = new Date()
  const tzOffsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}
