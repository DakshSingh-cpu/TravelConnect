-- =============================================================================
-- Conversation Briefs: stores traveller context handoff for advisor reference
-- =============================================================================

create table if not exists public.conversation_briefs (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  brief           jsonb        not null,
  created_at      timestamptz  not null default now()
);

-- Only participants in the conversation can read the brief
create policy "Participants can read conversation brief"
  on public.conversation_briefs for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

-- Participants can insert a brief (traveller writes on chat start)
create policy "Participants can insert conversation brief"
  on public.conversation_briefs for insert
  to authenticated
  with check (public.is_conversation_participant(conversation_id));

-- Upsert allowed (same traveller re-opening chat with updated session)
create policy "Participants can upsert conversation brief"
  on public.conversation_briefs for update
  to authenticated
  using (public.is_conversation_participant(conversation_id));

alter table public.conversation_briefs enable row level security;
