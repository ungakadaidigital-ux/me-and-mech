-- 006_create_job_card_items.sql

CREATE TYPE line_item_type AS ENUM ('labour', 'part');

CREATE TABLE job_card_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id  UUID           NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  item_type    line_item_type NOT NULL,
  description  TEXT           NOT NULL,
  quantity     NUMERIC(10,2)  NOT NULL DEFAULT 1,
  rate         NUMERIC(10,2)  NOT NULL,
  amount       NUMERIC(10,2)  GENERATED ALWAYS AS (quantity * rate) STORED,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_card_items_job_card_id ON job_card_items(job_card_id);

-- job_card_items has no workshop_id column — RLS (010) scopes it via a join
-- back to job_cards, since it's always accessed through its parent.
