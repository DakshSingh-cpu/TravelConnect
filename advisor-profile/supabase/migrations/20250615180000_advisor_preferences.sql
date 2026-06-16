-- Phase 4: Advisor preference controls
-- Advisors set min readiness score, budget floor, and nurture opt-in.
-- The matching engine respects these so low-quality leads never appear in their inbox.

CREATE TABLE IF NOT EXISTS public.advisor_preferences (
  user_id             uuid        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  min_readiness_score smallint    NOT NULL DEFAULT 35
    CHECK (min_readiness_score BETWEEN 0 AND 100),
  min_budget_lakh     numeric(6,2) NOT NULL DEFAULT 0
    CHECK (min_budget_lakh >= 0),
  accept_nurture_leads boolean    NOT NULL DEFAULT false,
  active_destinations  text[]     NOT NULL DEFAULT '{}',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.advisor_preferences.min_readiness_score IS
  'Only receive leads at or above this readiness score. Default 35 allows warm leads.';
COMMENT ON COLUMN public.advisor_preferences.accept_nurture_leads IS
  'When true, advisor opts in to receive nurture-tier (early-stage) leads.';

ALTER TABLE public.advisor_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors manage own preferences"
  ON public.advisor_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
