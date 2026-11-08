-- 007_create_invoices.sql

CREATE TYPE payment_status AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID');

CREATE TABLE invoices (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id      UUID           NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  job_card_id      UUID           NOT NULL UNIQUE REFERENCES job_cards(id) ON DELETE RESTRICT,
  invoice_number   TEXT           NOT NULL,
  gst_amount       NUMERIC(10,2)  NOT NULL DEFAULT 0, -- hardcoded 0 in MVP; CGST/SGST logic is Month 3+ (post-MVP)
  pdf_url          TEXT,
  whatsapp_sent    BOOLEAN        NOT NULL DEFAULT FALSE,
  sent_at          TIMESTAMPTZ,
  payment_status   payment_status NOT NULL DEFAULT 'PENDING',
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Invoice numbers are workshop-scoped (e.g. MG-2025-001), not globally unique
  UNIQUE (workshop_id, invoice_number)
);

CREATE INDEX idx_invoices_workshop_id ON invoices(workshop_id);
CREATE INDEX idx_invoices_workshop_payment_status ON invoices(workshop_id, payment_status);

COMMENT ON COLUMN invoices.gst_amount IS 'MVP: always 0. Do not implement CGST/SGST split logic — explicitly deferred to Month 3+ per locked roadmap.';
