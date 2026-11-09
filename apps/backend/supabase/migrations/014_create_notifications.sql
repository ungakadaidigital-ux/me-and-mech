-- 014_create_notifications.sql
-- Generic outbound notification log (WhatsApp/push/SMS delivery records).
-- Distinct from engagement_events (019/triggers layer schedules *when* to
-- send; this table records the actual send attempt and its outcome).

CREATE TYPE notification_channel AS ENUM ('whatsapp', 'push', 'sms', 'in_app');
CREATE TYPE notification_status AS ENUM ('sent', 'delivered', 'failed', 'skipped');

CREATE TABLE notifications (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id       UUID                 NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  notification_type TEXT                 NOT NULL, -- e.g. invoice_delivery, service_due_reminder, referral_reward
  channel           notification_channel NOT NULL,
  status            notification_status  NOT NULL DEFAULT 'sent',
  payload           JSONB,
  provider_message_id TEXT, -- e.g. Wati message id, for delivery status lookups
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_workshop_id ON notifications(workshop_id);
CREATE INDEX idx_notifications_workshop_type ON notifications(workshop_id, notification_type);
