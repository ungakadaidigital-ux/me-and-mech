-- 012_create_subscription_events.sql
-- Idempotency ledger for Razorpay webhooks. razorpay_event_id UNIQUE is the
-- entire idempotency mechanism for PKG-036 (GATED) — the webhook handler
-- always returns 200 immediately, and inserts here before applying any
-- side effect; a unique-violation on retry means "already processed."

CREATE TABLE subscription_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     UUID        NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type          TEXT        NOT NULL, -- e.g. subscription.charged, subscription.cancelled
  razorpay_event_id   TEXT        NOT NULL UNIQUE,
  payload             JSONB       NOT NULL,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_events_subscription_id ON subscription_events(subscription_id);
