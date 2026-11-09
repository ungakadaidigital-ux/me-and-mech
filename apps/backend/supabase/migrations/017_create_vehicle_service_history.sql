-- 017_create_vehicle_service_history.sql
-- Implements the locked privacy architecture:
--   Level 1 (mandatory): visible only to the workshop that created the record.
--   Level 2 (optional): customer-controlled sharing with another workshop.
-- What is NEVER shared even when shared_with_customer/cross-workshop
-- sharing is enabled: invoice amounts, customer phone numbers, mechanic
-- identity. This table intentionally does NOT store any of those fields —
-- it stores only the service-level summary that is safe to ever share.

CREATE TABLE vehicle_service_history (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  workshop_id           UUID        NOT NULL REFERENCES workshops(id) ON DELETE CASCADE, -- creating workshop; Level 1 partition key
  job_card_id           UUID        NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  service_summary       TEXT        NOT NULL, -- e.g. "Engine oil change, brake pad replacement" — no amounts, no names
  service_date          DATE        NOT NULL,
  shared_with_customer  BOOLEAN     NOT NULL DEFAULT FALSE, -- Level 2 opt-in, customer-controlled
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_service_history_vehicle_id ON vehicle_service_history(vehicle_id);
CREATE INDEX idx_vehicle_service_history_workshop_id ON vehicle_service_history(workshop_id);
