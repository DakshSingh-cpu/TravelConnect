-- =============================================================================
-- Pilot security hardening
--   1. Prevent privilege escalation: lock public.users.account_role so only
--      privileged (service-role / definer) connections may change it.
--   2. Enable RLS on seon_cache (fraud/PII cache) — service-role only.
--   3. Remove the open anon INSERT policy on match_sessions (inserts go through
--      the service-role API only).
--   4. Add the missing conversations UPDATE policy so participants can link a
--      conversation to a match session (link_conversation_to_match_session).
--   5. Add missing indexes on frequently-filtered foreign keys.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Lock account_role against self-promotion
-- -----------------------------------------------------------------------------
-- A BEFORE UPDATE trigger blocks any change to account_role unless the change
-- originates from a privileged role. Legitimate role assignment happens via the
-- SECURITY DEFINER function set_my_account_role(), which runs as the function
-- owner (postgres) and is therefore allowed. Direct client updates from the
-- `authenticated` / `anon` roles are rejected.

create or replace function public.prevent_account_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.account_role is distinct from old.account_role then
    if current_user not in ('postgres', 'service_role', 'supabase_admin') then
      raise exception 'account_role cannot be changed by this role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_prevent_account_role_change on public.users;
create trigger users_prevent_account_role_change
  before update on public.users
  for each row execute function public.prevent_account_role_change();

-- Defense in depth: remove the blanket UPDATE grant from client roles and
-- re-grant only the columns travellers/advisors may edit on their own profile.
-- (The client never updates account_role or id directly — those flow through
-- SECURITY DEFINER RPCs.)
revoke update on public.users from authenticated;
revoke update on public.users from anon;
grant update (full_name, avatar_url) on public.users to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Enable RLS on seon_cache (no client policies => service-role only)
-- -----------------------------------------------------------------------------
alter table public.seon_cache enable row level security;

-- -----------------------------------------------------------------------------
-- 3. Remove open anon INSERT on match_sessions
-- -----------------------------------------------------------------------------
-- All inserts happen via the service-role API (app/api/match-sessions,
-- app/api/onboarding/submit, lib/matchSessions/insertSession). With RLS enabled
-- and no INSERT policy for client roles, direct anon inserts are blocked while
-- the service role continues to bypass RLS.
drop policy if exists "Anon users can insert match sessions" on public.match_sessions;

-- -----------------------------------------------------------------------------
-- 4. Conversations UPDATE policy for participants
-- -----------------------------------------------------------------------------
-- link_conversation_to_match_session() is SECURITY INVOKER and runs
-- `update public.conversations` as the calling user; without an UPDATE policy
-- this silently affects zero rows. Restrict to conversation participants.
drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations for update
  to authenticated
  using (public.is_conversation_participant(id))
  with check (public.is_conversation_participant(id));

-- -----------------------------------------------------------------------------
-- 5. Missing indexes on frequently-filtered foreign keys
-- -----------------------------------------------------------------------------
create index if not exists lead_assignments_traveller_user_id_idx
  on public.lead_assignments (traveller_user_id);

create index if not exists session_telemetry_traveller_user_id_idx
  on public.session_telemetry (traveller_user_id);
