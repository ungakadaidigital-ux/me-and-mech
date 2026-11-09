-- test_rls.sql
-- PKG-010 gate requirement: run this against a staging Supabase project
-- with two real workshop accounts before sign-off.
--
-- Replace the placeholders with real values for two distinct test workshops
-- (Workshop A, Workshop B) created via the normal onboarding flow:
--   <WORKSHOP_A_USER_ID>  = users.id of Workshop A's owner (this is the JWT `sub`)
--   <WORKSHOP_B_ID>       = workshops.id of Workshop B
--   <WORKSHOP_A_ID>       = workshops.id of Workshop A
--
-- IMPORTANT: RLS does not apply to the postgres/service role, so this script
-- must switch to the `authenticated` role first, otherwise every query below
-- would "succeed" and the test would prove nothing.
--
-- Expected result for every SELECT below: 0 rows. Any row returned is an
-- RLS failure and must block sign-off.

BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"<WORKSHOP_A_USER_ID>","role":"authenticated"}', true);

-- Sanity check: Workshop A must see its OWN workshop (expect exactly 1 row).
-- If this returns 0 rows the claim/role setup above is wrong, and the
-- zero-row results below would be meaningless.
SELECT id FROM workshops;

-- Attempt to read Workshop B's data across every workshop-scoped table
SELECT * FROM customers WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM vehicles WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM job_cards WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM invoices WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM inventory WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM voice_sessions WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM vehicle_service_history WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM referral_codes WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM referral_entries WHERE referrer_workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM reward_transactions WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM subscriptions WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM notifications WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM push_tokens WHERE workshop_id = '<WORKSHOP_B_ID>';
SELECT * FROM notification_log WHERE workshop_id = '<WORKSHOP_B_ID>';

-- Zero-access tables — even Workshop A's own data must return 0 rows here,
-- since these tables have no policy for the authenticated role at all.
SELECT * FROM subscription_events LIMIT 1;
SELECT * FROM audit_logs LIMIT 1;
SELECT * FROM otp_requests LIMIT 1;
SELECT * FROM auth_sessions LIMIT 1;

-- Direct writes as an authenticated client must FAIL with a permission/RLS
-- error. Run each one individually (an error aborts the transaction, so
-- ROLLBACK and start again for the next).
-- INSERT INTO referral_codes (workshop_id, code) VALUES ('<WORKSHOP_A_ID>', 'MM-TEST1');
-- UPDATE reward_transactions SET notification_sent = true WHERE workshop_id = '<WORKSHOP_A_ID>';

ROLLBACK;
