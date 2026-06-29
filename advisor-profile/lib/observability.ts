import { logger, type LogContext } from '@/lib/logger'

/**
 * Single chokepoint for reporting unexpected errors.
 *
 * Today it emits a structured error log. To enable external error tracking,
 * install @sentry/nextjs and forward here (guarded by SENTRY_DSN) — every call
 * site already routes through this function, so no other code needs to change.
 */
export function captureException(error: unknown, context?: LogContext): void {
  const err = error instanceof Error ? error : new Error(String(error))

  logger.error(err.message, {
    name: err.name,
    stack: err.stack,
    ...context,
  })

  // Example future wiring (requires @sentry/nextjs + SENTRY_DSN):
  //   if (process.env.SENTRY_DSN) {
  //     const Sentry = await import('@sentry/nextjs')
  //     Sentry.captureException(err, { extra: context })
  //   }
}
