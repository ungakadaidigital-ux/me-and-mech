-- 029_create_notification_log.sql
-- Every outbound WhatsApp/push send, for dedup, delivery tracking, and
-- conversion analytics. Distinct from the generic `notifications` table
-- (migration 014) which is a lighter-weight per-workshop event log —
-- this is specifically the WhatsApp/Wati delivery ledger with the fields
-- Wati's webhooks populate (delivered_at, read_at, wati_msg_id).

CREATE TABLE notification_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id  UUID        NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  template_id  TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'sms_fallback')),
  wati_msg_id  TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  metadata     JSONB
);

CREATE INDEX idx_notification_log_workshop_sent ON notification_log(workshop_id, sent_at DESC);
CREATE INDEX idx_notification_log_template_status ON notification_log(template_id, status);

-- Layer 3 dedup: same phone + template + calendar day never sent twice.
-- Layers 1 (last_reminded_at on workshops-adjacent state) and 2 (QStash
-- deduplicationId) are enforced in application code (notification.service.ts);
-- this is the DB-level backstop.
CREATE UNIQUE INDEX idx_notification_log_dedup
  ON notification_log(phone, template_id, ((sent_at AT TIME ZONE 'UTC')::date));

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_log_select_own ON notification_log FOR SELECT USING (workshop_id = auth_workshop_id());
-- No client writes — service-role only, via notification.service.ts.

CREATE TABLE whatsapp_opt_out (
  phone      TEXT        PRIMARY KEY,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason     TEXT
);

COMMENT ON TABLE whatsapp_opt_out IS 'TRAI compliance: if a workshop replies STOP, add here and exclude from all future outbound WhatsApp sends permanently.';

ALTER TABLE whatsapp_opt_out ENABLE ROW LEVEL SECURITY;
-- No policies at all — this table is never read/written by any client,
-- only by the WhatsApp inbound-webhook handler and notification.service.ts.
