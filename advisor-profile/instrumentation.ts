/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Used to validate environment configuration up front so misconfiguration fails
 * fast at boot rather than surfacing as runtime errors during requests.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env')
    validateEnv()
  }
}
