-- Session telemetry for background lead vetting (service-role writes only)

create table if not exists public.session_telemetry (
  id                uuid primary key default gen_random_uuid(),
  match_session_id  uuid references public.match_sessions(id) on delete cascade,
  traveller_user_id uuid references public.users(id) on delete set null,
  payload           jsonb not null,
  created_at        timestamptz not null default now()
);

create index if not exists session_telemetry_match_session_idx
  on public.session_telemetry (match_session_id);

alter table public.match_sessions
  add column if not exists residential_zip text;

alter table public.session_telemetry enable row level security;

drop policy if exists "Travellers read own telemetry" on public.session_telemetry;
create policy "Travellers read own telemetry"
  on public.session_telemetry for select
  to authenticated
  using (traveller_user_id = auth.uid());
