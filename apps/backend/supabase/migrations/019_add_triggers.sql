-- 019_add_triggers.sql

-- Generic updated_at maintenance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_cards_updated_at
  BEFORE UPDATE ON job_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Guard: a PAID invoice's line items must never change (immutability rule
-- from PKG-024/028 spec — "Edit PAID invoice → 400 blocked" at the API
-- layer; this trigger is the DB-level backstop in case application logic
-- has a bug).
CREATE OR REPLACE FUNCTION prevent_paid_invoice_line_item_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_status payment_status;
BEGIN
  SELECT payment_status INTO v_status FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_status = 'PAID' THEN
    RAISE EXCEPTION 'Cannot modify line items of a PAID invoice (invoice_id=%)', COALESCE(NEW.invoice_id, OLD.invoice_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_line_items_immutable
  BEFORE UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION prevent_paid_invoice_line_item_mutation();
