-- Phase 5: 48-hour ghost prevention
-- Adds status tracking, advisor first-message timestamp, and traveller reply flag.
-- Two triggers enforce the ghost state machine server-side.

-- 1. Schema additions
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'completed')),
  ADD COLUMN IF NOT EXISTS first_advisor_message_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS traveller_replied_after_advisor boolean DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_status_advisor_msg
  ON public.conversations (status, first_advisor_message_at)
  WHERE status = 'active' AND first_advisor_message_at IS NOT NULL;

-- 2a. BEFORE INSERT guard — block messages on inactive conversations
CREATE OR REPLACE FUNCTION public.reject_message_on_inactive_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT status FROM public.conversations WHERE id = NEW.conversation_id) != 'active' THEN
    RAISE EXCEPTION 'Cannot send messages to an inactive conversation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_reject_inactive_conversation
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.reject_message_on_inactive_conversation();

-- 2b. AFTER INSERT tracking — ghost state machine
CREATE OR REPLACE FUNCTION public.track_ghost_prevention_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_role text;
  conv_first_advisor_msg timestamptz;
  conv_traveller_replied boolean;
BEGIN
  SELECT account_role INTO sender_role
  FROM public.users WHERE id = NEW.sender_id;

  IF sender_role IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT first_advisor_message_at, traveller_replied_after_advisor
  INTO conv_first_advisor_msg, conv_traveller_replied
  FROM public.conversations WHERE id = NEW.conversation_id;

  IF sender_role = 'advisor' AND conv_first_advisor_msg IS NULL THEN
    -- Advisor's first message in this conversation
    IF EXISTS (
      SELECT 1
      FROM public.messages m
      INNER JOIN public.users u ON u.id = m.sender_id
      WHERE m.conversation_id = NEW.conversation_id
        AND m.id != NEW.id
        AND u.account_role = 'traveller'
      LIMIT 1
    ) THEN
      -- Traveller already engaged before advisor — mark as replied immediately
      UPDATE public.conversations
      SET first_advisor_message_at = NEW.created_at,
          traveller_replied_after_advisor = true
      WHERE id = NEW.conversation_id;
    ELSE
      UPDATE public.conversations
      SET first_advisor_message_at = NEW.created_at
      WHERE id = NEW.conversation_id;
    END IF;
  END IF;

  IF sender_role = 'traveller'
    AND conv_first_advisor_msg IS NOT NULL
    AND conv_traveller_replied IS NOT TRUE
    AND NEW.created_at > conv_first_advisor_msg
  THEN
    UPDATE public.conversations
    SET traveller_replied_after_advisor = true
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_track_ghost_prevention
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.track_ghost_prevention_on_message();

-- 3. Defense-in-depth: update messages INSERT RLS to require active conversation
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id)
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.status = 'active'
    )
  );
