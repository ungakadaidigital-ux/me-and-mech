-- 025_enable_row_level_security.sql
-- PKG-010 — Row Level Security Policies. GATED package: requires a
-- two-workshop JWT test (test_rls.sql) confirming zero cross-workshop
-- visibility before this is considered done.
--
-- Refinement vs. earlier informal notes: policies use auth_workshop_id(),
-- a lookup through the `users` table, rather than assuming
-- `auth.uid() = workshop_id` directly. For a solo-owner workshop these are
-- numerically the same today, but the lookup form is what actually holds
-- up once a workshop has staff (MECHANIC/VIEWER roles, Month 6 roadmap
-- item) whose auth.uid() is NOT the workshop's own id. Getting this right
-- now avoids an RLS rewrite later. (021-023's policies, written before this
-- helper existed, are corrected to use it at the end of this file.)

CREATE OR REPLACE FUNCTION auth_workshop_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT workshop_id FROM users WHERE id = auth.uid()
$$;

-- ── workshops ──────────────────────────────────────────────────────────
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
CREATE POLICY workshops_select_own ON workshops FOR SELECT USING (id = auth_workshop_id());
CREATE POLICY workshops_update_own ON workshops FOR UPDATE USING (id = auth_workshop_id());
-- No client INSERT/DELETE — workshop creation happens via the onboarding
-- transaction (service role, PKG-018); workshops are never hard-deleted.

-- ── users ──────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_select_same_workshop ON users FOR SELECT USING (workshop_id = auth_workshop_id());
-- No client INSERT/UPDATE/DELETE — staff management is a service-role
-- operation gated by RBAC (PKG-020), not a direct table write.

-- ── customers ──────────────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_all_own_workshop ON customers
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── vehicles ───────────────────────────────────────────────────────────
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicles_all_own_workshop ON vehicles
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── job_cards ──────────────────────────────────────────────────────────
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY job_cards_all_own_workshop ON job_cards
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── job_card_items (scoped via parent job_cards, no workshop_id column) ─
ALTER TABLE job_card_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY job_card_items_via_parent ON job_card_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM job_cards jc WHERE jc.id = job_card_items.job_card_id AND jc.workshop_id = auth_workshop_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM job_cards jc WHERE jc.id = job_card_items.job_card_id AND jc.workshop_id = auth_workshop_id())
  );

-- ── invoices ───────────────────────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_all_own_workshop ON invoices
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── invoice_line_items (scoped via parent invoices) ──────────────────────
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_line_items_via_parent ON invoice_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = invoice_line_items.invoice_id AND inv.workshop_id = auth_workshop_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = invoice_line_items.invoice_id AND inv.workshop_id = auth_workshop_id())
  );

-- ── inventory ──────────────────────────────────────────────────────────
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_all_own_workshop ON inventory
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── inventory_transactions ───────────────────────────────────────────────
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_transactions_all_own_workshop ON inventory_transactions
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── subscriptions (read-only to client; writes are service-role/webhook) ─
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_select_own ON subscriptions FOR SELECT USING (workshop_id = auth_workshop_id());

-- ── subscription_events (service-role only, no client access at all) ────
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
-- Deliberately zero policies for the authenticated role — this table is
-- the Razorpay webhook idempotency ledger (PKG-036, GATED) and must never
-- be readable or writable by any client.

-- ── notifications (read-only to client) ──────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (workshop_id = auth_workshop_id());

-- ── audit_logs (no client access) ────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Deliberately zero policies — audit logs are for internal/founder review
-- (via the read-only Retool/Metabase DB role, per standing engineering
-- policy), never exposed to the mobile client.

-- ── voice_sessions ─────────────────────────────────────────────────────
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_sessions_all_own_workshop ON voice_sessions
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── vehicle_service_history ────────────────────────────────────────────
-- Level 1 (mandatory): only the creating workshop can read/write by default.
-- Level 2 (customer-controlled cross-workshop sharing) is NOT implemented
-- as a blanket RLS relaxation here — it requires a per-share grant record,
-- which is a Part 4/5 feature module (customer service passport), not part
-- of the base RLS layer. Do not weaken this policy to "any workshop can
-- read any shared row" without that grant mechanism designed first.
ALTER TABLE vehicle_service_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_service_history_own_workshop ON vehicle_service_history
  FOR ALL USING (workshop_id = auth_workshop_id()) WITH CHECK (workshop_id = auth_workshop_id());

-- ── Correction: referral tables' policies (021/022/023), now using the
--    same auth_workshop_id() helper instead of a bare auth.uid() compare ──
DROP POLICY IF EXISTS referral_codes_select_own ON referral_codes;
CREATE POLICY referral_codes_select_own ON referral_codes FOR SELECT USING (workshop_id = auth_workshop_id());

DROP POLICY IF EXISTS referral_entries_select_referrer ON referral_entries;
CREATE POLICY referral_entries_select_referrer ON referral_entries FOR SELECT USING (referrer_workshop_id = auth_workshop_id());

DROP POLICY IF EXISTS reward_transactions_select_own ON reward_transactions;
CREATE POLICY reward_transactions_select_own ON reward_transactions FOR SELECT USING (workshop_id = auth_workshop_id());
