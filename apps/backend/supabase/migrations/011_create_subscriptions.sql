-- 011_create_subscriptions.sql

CREATE TYPE subscription_record_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');

CREATE TABLE subscriptions (
  id                        UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id               UUID                        NOT NULL UNIQUE REFERENCES workshops(id) ON DELETE CASCADE,
  plan_type                 plan_type,
  razorpay_customer_id      TEXT,
  razorpay_subscription_id  TEXT                        UNIQUE,
  status                    subscription_record_status  NOT NULL DEFAULT 'trialing',
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  created_at                TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_workshop_id ON subscriptions(workshop_id);
CREATE INDEX idx_subscriptions_razorpay_id ON subscriptions(razorpay_subscription_id);
