-- 030_create_push_tokens.sql

CREATE TABLE push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID        NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  fcm_token   TEXT        NOT NULL UNIQUE,
  platform    TEXT        NOT NULL DEFAULT 'android',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_workshop_id ON push_tokens(workshop_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_tokens_all_own_workshop ON push_tokens
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());
-- Token registration IS a legitimate client write (device registers its own
-- token) — unlike most other tables in this system, this one gets a full
-- client-writable policy, scoped to the workshop's own rows.
