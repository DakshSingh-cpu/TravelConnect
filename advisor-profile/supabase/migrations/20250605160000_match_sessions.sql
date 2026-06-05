-- =============================================================================
-- match_sessions: persists the output of a completed traveller funnel
-- including ad attribution (UTM / fbclid) for ROI tracking.
-- Rows are anonymous — no auth.uid() required.
-- =============================================================================

create table if not exists public.match_sessions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- Intake payload (what the traveller answered)
  destination   text,
  budget_lakh   numeric,
  travel_style  text,
  vibe          text,
  pace          text,
  timing        text,
  duration      text,

  -- Top-3 matched advisor IDs (CSV agency IDs)
  advisor_ids   integer[],

  -- Ad attribution (null for organic visitors)
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  fbclid        text,
  landed_at     timestamptz  -- timestamp the user first hit /start
);

-- Index for dashboard queries grouping by campaign
create index match_sessions_utm_source_idx
  on public.match_sessions (utm_source)
  where utm_source is not null;

create index match_sessions_created_at_idx
  on public.match_sessions (created_at desc);

-- RLS: allow anonymous inserts (travellers are not logged in during the funnel)
-- and block all reads/updates from the client (read via service-role in dashboard)
alter table public.match_sessions enable row level security;

create policy "Anon users can insert match sessions"
  on public.match_sessions for insert
  to anon, authenticated
  with check (true);

-- No select / update / delete policies for client roles — use service-role in dashboard only
