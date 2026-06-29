-- =============================================================================
-- match_sessions idempotency
-- Lets the funnel dedupe retried submissions (network retries, double-clicks)
-- by supplying a stable client-generated key. Enforced by a partial unique
-- index so rows without a key are unaffected.
-- =============================================================================

alter table public.match_sessions
  add column if not exists idempotency_key text;

create unique index if not exists match_sessions_idempotency_key_idx
  on public.match_sessions (idempotency_key)
  where idempotency_key is not null;
