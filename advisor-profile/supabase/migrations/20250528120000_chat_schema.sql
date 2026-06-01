-- =============================================================================
-- Real-time chat schema (run in Supabase SQL Editor or via CLI migration)
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

-- Optional: link app advisor route IDs to Supabase user rows (agent accounts)
create table public.advisor_user_links (
  advisor_route_id text primary key,
  user_id uuid not null unique references public.users (id) on delete cascade,
  custom_bio text,
  custom_video_url text
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index conversation_participants_user_id_idx
  on public.conversation_participants (user_id);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at desc);

create index advisor_user_links_user_id_idx
  on public.advisor_user_links (user_id);

-- -----------------------------------------------------------------------------
-- Triggers: profiles + conversation touch
-- -----------------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- -----------------------------------------------------------------------------
-- Helper: participant check (used by RLS)
-- -----------------------------------------------------------------------------

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- RPC: find or create a 1:1 conversation (bypasses fragile participant INSERT RLS)
-- -----------------------------------------------------------------------------

create or replace function public.get_or_create_direct_conversation(peer_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if peer_user_id is null or peer_user_id = auth.uid() then
    raise exception 'Invalid peer user';
  end if;

  if not exists (select 1 from public.users u where u.id = peer_user_id) then
    raise exception 'Peer user does not exist';
  end if;

  select cp.conversation_id
  into existing_id
  from public.conversation_participants cp
  where cp.user_id = auth.uid()
    and cp.conversation_id in (
      select cp2.conversation_id
      from public.conversation_participants cp2
      where cp2.user_id = peer_user_id
    )
    and (
      select count(*)::int
      from public.conversation_participants cp3
      where cp3.conversation_id = cp.conversation_id
    ) = 2
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations default values
  returning id into new_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (new_id, auth.uid()), (new_id, peer_user_id);

  return new_id;
end;
$$;

grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.advisor_user_links enable row level security;

-- users
create policy "Users are readable by authenticated clients"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

-- conversations
create policy "Participants can read conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_participant(id));

-- conversation_participants
create policy "Participants can read conversation membership"
  on public.conversation_participants for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

-- messages
create policy "Participants can read messages"
  on public.messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- advisor_user_links (read-only for clients; seed via service role / dashboard)
create policy "Authenticated users can resolve advisor links"
  on public.advisor_user_links for select
  to authenticated
  using (true);

-- Advisors can update their own profile overrides (bio, video)
create policy "Advisors can update their own links"
  on public.advisor_user_links for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Realtime: broadcast new message rows to subscribers
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
