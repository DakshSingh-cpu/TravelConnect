-- Allow authenticated users to claim / update their advisor link (demo onboarding)
create policy "Users can insert own advisor link"
  on public.advisor_user_links for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can upsert own advisor link via update"
  on public.advisor_user_links for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
