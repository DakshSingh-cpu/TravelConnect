-- Fix: conversation_participants.user_id → public.users(id)
-- Auth users created before the profile trigger may be missing from public.users.

create or replace function public.ensure_public_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  au record;
begin
  if target_user_id is null then
    return;
  end if;

  if exists (select 1 from public.users u where u.id = target_user_id) then
    return;
  end if;

  select id, raw_user_meta_data
  into au
  from auth.users
  where id = target_user_id;

  if not found then
    raise exception 'User % is not registered in auth', target_user_id;
  end if;

  insert into public.users (id, full_name, avatar_url)
  values (
    au.id,
    coalesce(
      au.raw_user_meta_data ->> 'full_name',
      au.raw_user_meta_data ->> 'name',
      split_part((select email from auth.users where id = au.id), '@', 1)
    ),
    au.raw_user_meta_data ->> 'avatar_url'
  );
end;
$$;

-- Callable from the app after sign-in (current user only)
create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  perform public.ensure_public_user(auth.uid());
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;

-- Ensure BOTH chat participants exist before inserting conversation_participants
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

  perform public.ensure_public_user(auth.uid());
  perform public.ensure_public_user(peer_user_id);

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

-- One-time backfill for accounts that already existed in Auth
insert into public.users (id, full_name, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id)
on conflict (id) do nothing;
