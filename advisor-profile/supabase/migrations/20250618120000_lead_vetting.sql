-- Background lead vetting: repurpose lead_assignments from advisor double opt-in

alter table public.lead_assignments
  add column if not exists vetting_score smallint,
  add column if not exists vetting_result jsonb,
  add column if not exists seon_transaction_id text,
  add column if not exists email_sent_at timestamptz,
  add column if not exists chat_unlocked_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists vetting_attempts smallint not null default 0;

-- Backfill existing rows before constraint swap
update public.lead_assignments set status = 'vetting' where status = 'pending';
update public.lead_assignments
  set status = 'approved', approved_at = coalesce(responded_at, created_at)
  where status = 'accepted';
update public.lead_assignments set status = 'blocked' where status in ('rejected', 'expired');

drop index if exists lead_assignments_one_pending_per_session;
create unique index if not exists lead_assignments_one_vetting_per_session
  on public.lead_assignments (match_session_id)
  where status = 'vetting';

alter table public.lead_assignments drop constraint if exists lead_assignments_status_check;
alter table public.lead_assignments
  add constraint lead_assignments_status_check
  check (status in ('vetting','approved','blocked','dismissed','superseded'));

alter table public.lead_assignments
  alter column vetting_attempts set default 0;

update public.lead_assignments
  set email_sent_at = coalesce(responded_at, created_at),
      chat_unlocked_at = coalesce(responded_at, created_at)
  where status = 'approved' and email_sent_at is null;

alter table public.match_sessions drop constraint if exists match_sessions_lead_status_check;
alter table public.match_sessions
  add constraint match_sessions_lead_status_check
  check (lead_status is null or lead_status in ('pending','accepted','blocked','exhausted'));

create index if not exists lead_assignments_delayed_email_idx
  on public.lead_assignments (status, email_sent_at, approved_at)
  where status = 'approved' and email_sent_at is null;

create table if not exists public.seon_cache (
  traveller_user_id uuid primary key references public.users(id) on delete cascade,
  result jsonb not null,
  expires_at timestamptz not null
);

create index if not exists seon_cache_expires_idx on public.seon_cache (expires_at);

-- Remove advisor update on pending assignments
drop policy if exists "Advisors update pending assignments" on public.lead_assignments;

drop policy if exists "Admins read all assignments" on public.lead_assignments;
create policy "Admins read all assignments"
  on public.lead_assignments for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins update assignments" on public.lead_assignments;
create policy "Admins update assignments"
  on public.lead_assignments for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
