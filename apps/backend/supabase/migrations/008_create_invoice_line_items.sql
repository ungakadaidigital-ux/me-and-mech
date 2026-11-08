-- 008_create_invoice_line_items.sql
-- Snapshot of job_card_items at the moment of invoicing. Deliberately
-- separate from job_card_items: once an invoice is generated, its line
-- items must never change even if the underlying job card is edited later
-- (job cards are draft/in_progress and can still be adjusted; invoices,
-- once created, are the immutable financial record).

CREATE TABLE invoice_line_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  TEXT           NOT NULL,
  quantity     NUMERIC(10,2)  NOT NULL,
  rate         NUMERIC(10,2)  NOT NULL,
  amount       NUMERIC(10,2)  GENERATED ALWAYS AS (quantity * rate) STORED
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
