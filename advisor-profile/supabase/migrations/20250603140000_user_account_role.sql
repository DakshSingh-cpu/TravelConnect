-- =============================================================================
-- Immutable account role: traveller vs advisor (set once at onboarding)
-- =============================================================================

alter table public.users
  add column if not exists account_role text
  check (account_role in ('traveller', 'advisor'));

-- Backfill existing rows
update public.users u
set account_role = 'advisor'
where account_role is null
  and exists (
    select 1 from public.advisor_user_links l where l.user_id = u.id
  );

update public.users
set account_role = 'traveller'
where account_role is null;

alter table public.users
  alter column account_role set default 'traveller';

alter table public.users
  alter column account_role set not null;

-- Set role once for the current user (immutable after first assignment)
create or replace function public.set_my_account_role(p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_role is null or p_role not in ('traveller', 'advisor') then
    raise exception 'Invalid account role';
  end if;

  perform public.ensure_public_user(auth.uid());

  select u.account_role into current_role
  from public.users u
  where u.id = auth.uid();

  if current_role is not null and current_role <> p_role then
    raise exception 'Account role is already set to % and cannot be changed', current_role;
  end if;

  if current_role is null then
    update public.users
    set account_role = p_role
    where id = auth.uid();
  end if;

  return p_role;
end;
$$;

grant execute on function public.set_my_account_role(text) to authenticated;

-- Advisor links may only be created by advisor accounts
drop policy if exists "Users can insert own advisor link" on public.advisor_user_links;

create policy "Advisors can insert own advisor link"
  on public.advisor_user_links for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.account_role = 'advisor'
    )
  );
