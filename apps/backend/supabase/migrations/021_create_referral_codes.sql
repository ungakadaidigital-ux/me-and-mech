-- 021_create_referral_codes.sql
-- One shareable code per workshop. Format: MM-XXXXX.

CREATE TABLE referral_codes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    UUID        NOT NULL UNIQUE REFERENCES workshops(id) ON DELETE CASCADE,
  code           VARCHAR(12) NOT NULL UNIQUE CHECK (code ~ '^MM-[A-Z0-9]{5,8}$'),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  revoked_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code) WHERE is_active = TRUE;

COMMENT ON TABLE referral_codes IS 'Code validation at registration happens server-side via Edge Function (service role) — no client read access to arbitrary codes, to prevent enumeration/scraping.';

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_codes_select_own
  ON referral_codes FOR SELECT
  USING (workshop_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy for the authenticated role — issuance is
-- service-role only, at workshop registration (see PKG-018).
