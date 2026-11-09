-- 023_create_reward_transactions.sql
-- Append-only ledger. One row per MILESTONE threshold crossed
-- (1st/3rd/5th/10th successful referral) — not one row per successful
-- referral. This is the idempotency boundary for QStash retries.

CREATE TABLE reward_transactions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_entry_id  UUID        NOT NULL REFERENCES referral_entries(id) ON DELETE RESTRICT,
  workshop_id        UUID        NOT NULL REFERENCES workshops(id) ON DELETE CASCADE, -- the referrer being rewarded
  reward_type        TEXT        NOT NULL CHECK (reward_type IN ('days_15', 'month_1', 'month_2', 'discount_20')),
  reward_value_days  INTEGER,    -- NULL for discount_20
  idempotency_key    TEXT        NOT NULL UNIQUE,
  applied_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_sent  BOOLEAN     NOT NULL DEFAULT FALSE,

  UNIQUE (referral_entry_id, reward_type)
);

CREATE INDEX idx_reward_transactions_workshop ON reward_transactions(workshop_id);

COMMENT ON TABLE reward_transactions IS 'Never UPDATE or DELETE a row — corrections are new offsetting rows. workshops.subscription_ends_at / discount_permanent are the derived, mutable fields this ledger justifies.';

ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reward_transactions_select_own
  ON reward_transactions FOR SELECT
  USING (workshop_id = auth.uid());

-- No client INSERT/UPDATE/DELETE — written exclusively by the
-- referral-reward-worker (QStash consumer, service role). See PKG-034 v2.
