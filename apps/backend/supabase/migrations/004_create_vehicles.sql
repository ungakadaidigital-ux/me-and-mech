-- 004_create_vehicles.sql

CREATE TABLE vehicles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id     UUID        NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id     UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_number  VARCHAR(15) NOT NULL, -- TN01AB1234 format, validated at app layer
  make            TEXT,
  model           TEXT,
  year            SMALLINT,
  fuel_type       TEXT,
  colour          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Duplicate vehicle number detection is workshop-scoped (per PKG-026 spec:
  -- ERR_DUPLICATE_VEHICLE_NUMBER is a per-workshop conflict, not global —
  -- the same vehicle could theoretically be serviced at multiple workshops).
  UNIQUE (workshop_id, vehicle_number)
);

CREATE INDEX idx_vehicles_workshop_id ON vehicles(workshop_id);
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
