-- 005_create_job_cards.sql

CREATE TYPE job_card_status AS ENUM ('draft', 'in_progress', 'invoiced', 'paid');

CREATE TABLE job_cards (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id  UUID             NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id  UUID             NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id   UUID             NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  job_date     DATE             NOT NULL DEFAULT CURRENT_DATE,
  job_type     TEXT             NOT NULL,
  status       job_card_status  NOT NULL DEFAULT 'draft',
  km           INTEGER,
  notes        TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_cards_workshop_id ON job_cards(workshop_id);
CREATE INDEX idx_job_cards_workshop_status ON job_cards(workshop_id, status);
CREATE INDEX idx_job_cards_customer_id ON job_cards(customer_id);
CREATE INDEX idx_job_cards_vehicle_id ON job_cards(vehicle_id);

COMMENT ON TABLE job_cards IS 'referee_job_count in referral_entries is computed as COUNT(*) of this table per workshop_id, not stored redundantly.';
