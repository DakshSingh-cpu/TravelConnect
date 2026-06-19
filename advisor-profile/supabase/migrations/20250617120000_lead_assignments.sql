-- =============================================================================
-- lead_assignments: double opt-in lead acceptance before chat creation.
-- One row per advisor attempt for a traveller request.
-- Keeps conversations.status untouched (ghost prevention stays as-is).
-- =============================================================================

-- 1. New table
create table if not exists public.lead_assignments (
  id                uuid primary key default gen_random_uuid(),
  match_session_id  uuid not null references public.match_sessions(id) on delete cascade,
  traveller_user_id uuid not null references public.users(id) on delete cascade,
  advisor_user_id   uuid not null references public.users(id) on delete cascade,
  advisor_route_id  text not null,
  rank              smallint not null check (rank between 1 and 10),
  status            text not null default 'pending'
    check (status in ('pending','accepted','rejected','expired','superseded')),
  conversation_id   uuid references public.conversations(id) on delete set null,
  created_at        timestamptz not null default now(),
  responded_at      timestamptz,
  expires_at        timestamptz not null default (now() + interval '24 hours')
);

-- Only one pending assignment per match session at a time
create unique index if not exists lead_assignments_one_pending_per_session
  on public.lead_assignments (match_session_id)
  where status = 'pending';

create index if not exists lead_assignments_advisor_pending_idx
  on public.lead_assignments (advisor_user_id, status)
  where status = 'pending';

create index if not exists lead_assignments_expires_at_idx
  on public.lead_assignments (expires_at)
  where status = 'pending';

create index if not exists lead_assignments_match_session_idx
  on public.lead_assignments (match_session_id);

-- 2. match_sessions: track overall lead lifecycle
alter table public.match_sessions
  add column if not exists lead_status text default null
    check (lead_status is null or lead_status in ('pending','accepted','exhausted'));

-- 3. conversations: optional FK back to the assignment that created it
alter table public.conversations
  add column if not exists lead_assignment_id uuid references public.lead_assignments(id) on delete set null;

-- 4. RLS
alter table public.lead_assignments enable row level security;

-- Travellers can read their own assignments
drop policy if exists "Travellers read own assignments" on public.lead_assignments;
create policy "Travellers read own assignments"
  on public.lead_assignments for select
  to authenticated
  using (traveller_user_id = auth.uid());

-- Advisors can read assignments directed to them
drop policy if exists "Advisors read own assignments" on public.lead_assignments;
create policy "Advisors read own assignments"
  on public.lead_assignments for select
  to authenticated
  using (advisor_user_id = auth.uid());

-- Advisors can update pending assignments directed to them (accept / reject)
drop policy if exists "Advisors update pending assignments" on public.lead_assignments;
create policy "Advisors update pending assignments"
  on public.lead_assignments for update
  to authenticated
  using (advisor_user_id = auth.uid() and status = 'pending')
  with check (advisor_user_id = auth.uid());

-- 5. Realtime for advisors to see new lead assignments
do $$
begin
  alter publication supabase_realtime add table public.lead_assignments;
exception
  when duplicate_object then null;
end $$;
