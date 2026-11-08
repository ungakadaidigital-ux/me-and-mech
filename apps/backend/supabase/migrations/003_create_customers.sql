-- 003_create_customers.sql

CREATE TABLE customers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id  UUID        NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  phone        VARCHAR(15) NOT NULL,
  city         TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Duplicate-phone detection is workshop-scoped, not global — the same
  -- customer phone can legitimately appear at two different workshops.
  UNIQUE (workshop_id, phone)
);

CREATE INDEX idx_customers_workshop_id ON customers(workshop_id);
CREATE INDEX idx_customers_workshop_name_search ON customers(workshop_id, name);
