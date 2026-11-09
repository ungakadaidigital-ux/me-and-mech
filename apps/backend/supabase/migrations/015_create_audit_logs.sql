-- 015_create_audit_logs.sql

CREATE TABLE audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id   UUID        REFERENCES workshops(id) ON DELETE SET NULL,
  actor_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL, -- e.g. AUTH_SUCCESS, PERMISSION_DENIED, INVOICE_DELETED, WORKSHOP_SETTINGS_CHANGED
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workshop_id ON audit_logs(workshop_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

COMMENT ON TABLE audit_logs IS 'Never write phone numbers, OTPs, or JWTs into metadata — same PII rule as application logging (PKG-007).';
