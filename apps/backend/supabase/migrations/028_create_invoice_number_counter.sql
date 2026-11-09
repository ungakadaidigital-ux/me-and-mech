-- 028_create_invoice_number_counter.sql
--
-- Invoice numbers are workshop-scoped (e.g. MG-2026-001) — a plain
-- Postgres SEQUENCE is global/unpartitioned, so it can't produce a
-- per-workshop sequential counter on its own. This table + function pair
-- gets the same safety guarantee a SEQUENCE gives (atomic, race-free
-- increment) but scoped per workshop per year, via UPDATE ... RETURNING,
-- which takes a row lock for the duration of the transaction — concurrent
-- callers serialize on that row rather than racing on MAX(invoice_number)+1.

CREATE TABLE workshop_invoice_counters (
  workshop_id  UUID    NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  last_number  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workshop_id, year)
);

CREATE OR REPLACE FUNCTION next_invoice_number(p_workshop_id UUID, p_prefix TEXT, p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO workshop_invoice_counters (workshop_id, year, last_number)
  VALUES (p_workshop_id, p_year, 1)
  ON CONFLICT (workshop_id, year)
  DO UPDATE SET last_number = workshop_invoice_counters.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN p_prefix || '-' || p_year || '-' || LPAD(v_next::TEXT, 3, '0');
END;
$$;

COMMENT ON FUNCTION next_invoice_number IS 'PKG-028. Call via RPC from InvoiceService, never compute invoice numbers client-side or via MAX(invoice_number)+1.';

ALTER TABLE workshop_invoice_counters ENABLE ROW LEVEL SECURITY;
-- No client policies — invoice numbering is a service-role/RPC-only concern
-- (the RPC function runs with definer rights via the migration owner, and
-- is invoked through the admin client from InvoiceService, not directly by
-- an authenticated client query against this table).
