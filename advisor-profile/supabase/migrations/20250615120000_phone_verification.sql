-- Phase 3: Phone OTP gate for travellers before advisor chat.
-- Verification state lives in auth.users (phone, phone_confirmed_at) — NOT in public.users.
-- This prevents client-side RLS spoofing since auth.users is only writable by Supabase Auth internals.

create or replace function public.get_or_create_direct_conversation(peer_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
  caller_role text;
  caller_phone_confirmed timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if peer_user_id is null or peer_user_id = auth.uid() then
    raise exception 'Invalid peer user';
  end if;

  -- Travellers must have a confirmed phone via Supabase Auth OTP
  select account_role into caller_role
  from public.users where id = auth.uid();

  if caller_role = 'traveller' then
    select phone_confirmed_at into caller_phone_confirmed
    from auth.users where id = auth.uid();

    if caller_phone_confirmed is null then
      raise exception 'Phone verification required to connect with an advisor';
    end if;
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
