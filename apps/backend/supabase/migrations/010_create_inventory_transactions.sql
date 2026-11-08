-- 010_create_inventory_transactions.sql

CREATE TYPE inventory_transaction_type AS ENUM ('stock_in', 'stock_out');

CREATE TABLE inventory_transactions (
  id                  UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id         UUID                       NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  inventory_id        UUID                       NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  job_card_id         UUID                       REFERENCES job_cards(id) ON DELETE SET NULL,
  transaction_type     inventory_transaction_type NOT NULL,
  quantity_change      INTEGER                    NOT NULL, -- positive for stock_in, negative for stock_out
  created_at          TIMESTAMPTZ                NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_transactions_workshop_id ON inventory_transactions(workshop_id);
CREATE INDEX idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
