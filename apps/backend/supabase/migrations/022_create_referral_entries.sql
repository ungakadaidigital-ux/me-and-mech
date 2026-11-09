-- 022_create_referral_entries.sql
-- One row per referee (unique). Tracks the referral relationship/attempt.

CREATE TABLE referral_entries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id      UUID        NOT NULL REFERENCES referral_codes(id) ON DELETE RESTRICT,
  referrer_workshop_id  UUID        NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  referee_workshop_id   UUID        NOT NULL UNIQUE REFERENCES workshops(id) ON DELETE CASCADE,
  status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  referee_job_count     INTEGER     NOT NULL DEFAULT 0,
  device_fingerprint    TEXT,
  ip_address            INET,
  abuse_flagged         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  resolved_at           TIMESTAMPTZ,

  CHECK (referrer_workshop_id <> referee_workshop_id)
);

CREATE INDEX idx_referral_entries_referrer ON referral_entries(referrer_workshop_id, status);
CREATE INDEX idx_referral_entries_pending_expiry ON referral_entries(expires_at) WHERE status = 'pending';

COMMENT ON TABLE referral_entries IS 'referee_workshop_id UNIQUE enforces a workshop can only ever be referred once — prevents re-registration abuse.';

ALTER TABLE referral_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_entries_select_referrer
  ON referral_entries FOR SELECT
  USING (referrer_workshop_id = auth.uid());

-- No client INSERT/UPDATE/DELETE — created at referee registration and
-- transitioned by the referral-success-trigger Edge Function / pg_cron
-- expiry sweep (020), both service-role only.
