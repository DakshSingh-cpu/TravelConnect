-- =============================================================================
-- match_sessions: lead readiness scoring from synthesize-brief (Phase 2 guardrails)
-- =============================================================================

ALTER TABLE public.match_sessions
  ADD COLUMN IF NOT EXISTS readiness_score smallint DEFAULT 50
    CHECK (readiness_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS readiness_tier text DEFAULT 'warm'
    CHECK (readiness_tier IN ('hot', 'warm', 'nurture', 'blocked')),
  ADD COLUMN IF NOT EXISTS low_intent_signals text[] DEFAULT '{}';

COMMENT ON COLUMN public.match_sessions.readiness_score IS
  'Lead readiness 0-100. Scored during synthesize-brief.';
COMMENT ON COLUMN public.match_sessions.readiness_tier IS
  'Server-derived tier: hot | warm | nurture | blocked';
COMMENT ON COLUMN public.match_sessions.low_intent_signals IS
  'Up to 3 signals that reduced readiness score';
