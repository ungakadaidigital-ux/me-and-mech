-- 009_create_inventory.sql

CREATE TABLE inventory (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id          UUID           NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name                 VARCHAR(200)   NOT NULL,
  quantity             INTEGER        NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER        NOT NULL DEFAULT 5,
  cost_price           NUMERIC(10,2), -- private — never shown on customer-facing invoice/PDF
  selling_price        NUMERIC(10,2),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_workshop_id ON inventory(workshop_id);
CREATE INDEX idx_inventory_low_stock ON inventory(workshop_id) WHERE quantity <= low_stock_threshold;
