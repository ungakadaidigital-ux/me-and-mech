-- 002_create_workshops.sql
-- Canonical parent entity. workshops.id is the RLS partition key used
-- across every other table in the system. "workshops" is the locked
-- canonical name — "mechanics" is a documentation alias only, never a
-- table/column name.

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'grace', 'read_only', 'expired', 'churned');
CREATE TYPE plan_type AS ENUM ('monthly', 'annual');
CREATE TYPE workshop_size AS ENUM ('solo', 'small', 'large');

CREATE TABLE workshops (
  id                    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  phone                 VARCHAR(15)         UNIQUE NOT NULL,
  shop_name             TEXT                NOT NULL,
  owner_name            TEXT                NOT NULL,
  city                  TEXT                NOT NULL,
  address               TEXT,
  gst_number            VARCHAR(20),        -- optional; CGST/SGST calc deferred post-MVP
  upi_id                TEXT,
  invoice_prefix        VARCHAR(10)         NOT NULL,
  subscription_status   subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at         TIMESTAMPTZ         GENERATED ALWAYS AS (created_at + INTERVAL '30 days') STORED,
  subscription_ends_at  TIMESTAMPTZ,
  plan_type             plan_type,
  discount_permanent    BOOLEAN             NOT NULL DEFAULT FALSE, -- true at 10+ successful referrals
  offer_shown           BOOLEAN             NOT NULL DEFAULT FALSE, -- Day 28 one-time offer, non-repeatable
  workshop_size         workshop_size,
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Break the circular dependency from 001_create_users.sql
ALTER TABLE users
  ADD CONSTRAINT fk_users_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE;

CREATE INDEX idx_users_workshop_id ON users(workshop_id);

COMMENT ON TABLE workshops IS 'Canonical parent entity. id = RLS partition key. NOTE: no referral_code column here by design — see migration 021/024; referral_codes table is the sole source of truth.';
