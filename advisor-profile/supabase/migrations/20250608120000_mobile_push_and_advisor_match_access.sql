-- =============================================================================
-- Mobile advisor app: push tokens, advisor match_session access, conversation link
-- =============================================================================

-- -----------------------------------------------------------------------------
-- push_tokens: Expo push tokens for advisor mobile notifications
-- -----------------------------------------------------------------------------

create table if not exists public.push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  expo_push_token text not null,
  platform        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index if not exists push_tokens_user_id_idx
  on public.push_tokens (user_id);

drop trigger if exists push_tokens_updated_at on public.push_tokens;
create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.handle_updated_at();

alter table public.push_tokens enable row level security;

drop policy if exists "Users can read own push tokens" on public.push_tokens;
create policy "Users can read own push tokens"
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own push tokens" on public.push_tokens;
create policy "Users can insert own push tokens"
  on public.push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own push tokens" on public.push_tokens;
create policy "Users can update own push tokens"
  on public.push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own push tokens" on public.push_tokens;
create policy "Users can delete own push tokens"
  on public.push_tokens for delete
  to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- match_sessions: allow matched advisors to read their sessions
-- -----------------------------------------------------------------------------

create or replace function public.get_my_agency_id()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select (regexp_match(l.advisor_route_id, '^agency-(\d+)$'))[1]::integer
  from public.advisor_user_links l
  where l.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_agency_id() to authenticated;

drop policy if exists "Advisors can read their matched sessions" on public.match_sessions;
create policy "Advisors can read their matched sessions"
  on public.match_sessions for select
  to authenticated
  using (
    public.get_my_agency_id() is not null
    and advisor_ids @> array[public.get_my_agency_id()]
  );

-- -----------------------------------------------------------------------------
-- conversations: optional link back to the traveller funnel session
-- -----------------------------------------------------------------------------

alter table public.conversations
  add column if not exists match_session_id uuid references public.match_sessions (id) on delete set null;

create index if not exists conversations_match_session_id_idx
  on public.conversations (match_session_id)
  where match_session_id is not null;

create or replace function public.get_conversation_for_match_session(p_match_session_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select c.id
  from public.conversations c
  inner join public.conversation_participants cp on cp.conversation_id = c.id
  where c.match_session_id = p_match_session_id
    and cp.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_conversation_for_match_session(uuid) to authenticated;

create or replace function public.link_conversation_to_match_session(
  p_conversation_id uuid,
  p_match_session_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a conversation participant';
  end if;

  update public.conversations
  set match_session_id = p_match_session_id,
      updated_at = now()
  where id = p_conversation_id
    and match_session_id is null;
end;
$$;

grant execute on function public.link_conversation_to_match_session(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: advisors receive new match_session rows they are matched to
-- -----------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.match_sessions;
exception
  when duplicate_object then null;
end $$;
