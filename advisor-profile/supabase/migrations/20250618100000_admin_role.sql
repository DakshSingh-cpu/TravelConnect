-- Extend account_role to include admin (assigned via service role only)

alter table public.users drop constraint if exists users_account_role_check;

alter table public.users
  add constraint users_account_role_check
  check (account_role in ('traveller', 'advisor', 'admin'));

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = p_user_id and u.account_role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;
