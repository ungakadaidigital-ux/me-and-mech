-- 026_create_auth_tables.sql
--
-- Supabase Auth handles JWT *format*/verification; MSG91 handles OTP SMS
-- delivery (locked decision). Because MSG91 is not a native GoTrue phone
-- provider, OTP issuance/verification is implemented ourselves here, and
-- on success we mint our own Supabase-compliant JWT (signed with the same
-- project JWT secret) rather than going through GoTrue's phone-auth flow.
-- These two tables support that: OTP challenge storage, and our own
-- refresh-token session ledger (since we're not using GoTrue's session
-- tables either).

CREATE TABLE otp_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(15) NOT NULL,
  otp_hash    TEXT        NOT NULL,
  attempts    SMALLINT    NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_requests_phone ON otp_requests(phone, created_at DESC);

-- No RLS policies for the authenticated role — this table is never
-- readable/writable by any client, only by the backend using the admin
-- client. Enable RLS anyway so a future misconfigured anon-key exposure
-- fails closed, not open.
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE auth_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT        NOT NULL UNIQUE,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only, same reasoning as otp_requests.
