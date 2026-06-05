-- Fix: PL/pgSQL variable "current_role" shadowed PostgreSQL built-in current_role
-- (session DB role, e.g. "postgres"), causing set_my_account_role to always fail.

create or replace function public.set_my_account_role(p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_account_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_role is null or p_role not in ('traveller', 'advisor') then
    raise exception 'Invalid account role';
  end if;

  perform public.ensure_public_user(auth.uid());

  select u.account_role into existing_account_role
  from public.users u
  where u.id = auth.uid();

  if existing_account_role is not null and existing_account_role <> p_role then
    raise exception 'Account role is already set to % and cannot be changed', existing_account_role;
  end if;

  if existing_account_role is null then
    update public.users
    set account_role = p_role
    where id = auth.uid();
  end if;

  return p_role;
end;
$$;

grant execute on function public.set_my_account_role(text) to authenticated;
