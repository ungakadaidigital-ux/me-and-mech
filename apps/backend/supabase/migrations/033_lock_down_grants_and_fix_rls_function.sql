-- 033_lock_down_grants_and_fix_rls_function.sql
--
-- Found during the first real-database RLS test on staging:
--  1. auth_workshop_id() (migration 025) is recursive: users policy -> function
--     -> users table. Fixed with SECURITY DEFINER + row_security off.
--  2. Supabase default privileges give anon/authenticated broad table rights
--     (incl. TRUNCATE, which RLS does not cover) on tables clients must never
--     touch. Replaced with explicit least-privilege grants.
-- Idempotent: safe to run on a database where the staging hot-fixes already exist.

-- 1. Non-recursive RLS helper
CREATE OR REPLACE FUNCTION public.auth_workshop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT u.workshop_id
  FROM public.users u
  WHERE u.id = COALESCE(
    auth.uid(),
    NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  )
  LIMIT 1;
$$;

-- 2. Remove every broad default grant from client roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Functions: nobody but the service role (and the owner) may call them,
-- except the RLS helper which policies need.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.auth_workshop_id() TO authenticated;

-- The service role (backend admin client) keeps full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 3. Least-privilege grants for logged-in users (RLS still filters rows)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Read access
GRANT SELECT ON
  users, workshops, customers, vehicles, job_cards, job_card_items,
  invoices, invoice_line_items, inventory, inventory_transactions,
  voice_sessions, push_tokens, vehicle_service_history,
  subscriptions, notifications, notification_log,
  referral_codes, referral_entries, reward_transactions
TO authenticated;

-- Write access, only where the API writes with the user's own token
GRANT INSERT, UPDATE ON customers, vehicles, job_cards, invoices, inventory, push_tokens TO authenticated;
GRANT INSERT, UPDATE, DELETE ON job_card_items TO authenticated;
GRANT INSERT ON invoice_line_items, inventory_transactions, voice_sessions TO authenticated;

-- workshops: profile columns only (subscription/referral fields are service-role only)
GRANT UPDATE (shop_name, address, gst_number, upi_id, workshop_size) ON workshops TO authenticated;

-- Never granted to clients: otp_requests, auth_sessions, audit_logs,
-- subscription_events, whatsapp_opt_out, workshop_invoice_counters.

-- 4. Stop future tables from silently re-opening access
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
