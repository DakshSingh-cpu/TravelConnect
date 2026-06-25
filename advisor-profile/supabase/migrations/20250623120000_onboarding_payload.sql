-- Extend match_sessions for the 11-step onboarding wizard.
-- Stores the full onboarding payload as JSONB alongside the existing
-- flattened intake columns for backward compatibility.

ALTER TABLE match_sessions ADD COLUMN IF NOT EXISTS onboarding_payload jsonb;
ALTER TABLE match_sessions ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE match_sessions ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE match_sessions ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE match_sessions ADD COLUMN IF NOT EXISTS self_reported_source text;
ALTER TABLE match_sessions ADD COLUMN IF NOT EXISTS verified_phone text;

COMMENT ON COLUMN match_sessions.onboarding_payload IS 'Full 11-step wizard payload (OnboardingPayload JSON)';
COMMENT ON COLUMN match_sessions.contact_phone IS 'Phone entered at wizard step 10 (unverified intent)';
COMMENT ON COLUMN match_sessions.verified_phone IS 'Phone confirmed via OTP; may differ from contact_phone';
