/**
 * Minimal structured logger.
 *
 * Emits single-line JSON so logs are queryable in Vercel/any log aggregator, with
 * a small redaction pass so common PII / secret keys are never written. Runtime-
 * agnostic (no Node-only imports) so it can be used in route handlers and edge
 * middleware alike.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

const REDACT_KEYS = [
  'email',
  'phone',
  'contact_email',
  'contact_phone',
  'password',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'secret',
  'service_role',
]

function redact(context: LogContext): LogContext {
  const out: LogContext = {}
  for (const [key, value] of Object.entries(context)) {
    const lower = key.toLowerCase()
    if (REDACT_KEYS.some((k) => lower.includes(k))) {
      out[key] = '[redacted]'
    } else {
      out[key] = value
    }
  }
  return out
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? redact(context) : {}),
  }
  const serialized = JSON.stringify(line)
  if (level === 'error') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.log(serialized)
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
}
