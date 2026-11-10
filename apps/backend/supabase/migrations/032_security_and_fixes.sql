-- 032_security_and_fixes.sql
--
-- Two fixes found while reviewing migrations 002, 025 and 027.
-- Written as a NEW migration (not an edit of 002/025) so any database that
-- already ran those files can still apply it.

-- 1. workshops.gst_number was VARCHAR(20), but the application stores the
--    AES-256-GCM encrypted value (iv:tag:ciphertext, roughly 88 characters
--    for a 15-character GST number). Inserting or updating a real GST number
--    would fail with "value too long for type character varying(20)".
ALTER TABLE workshops ALTER COLUMN gst_number TYPE TEXT;

-- 2. Migration 025's policy workshops_update_own lets a workshop UPDATE every
--    column of its own row, including subscription_status,
--    subscription_ends_at, discount_permanent and offer_shown. Anyone holding
--    their own JWT could call PostgREST directly and mark themselves "active".
--    RLS decides WHICH rows; column privileges decide WHICH columns.
--    Only the profile fields below stay writable by the authenticated role;
--    subscription and referral fields are written by the service role only
--    (webhooks, workers), which bypasses these grants.
REVOKE UPDATE ON workshops FROM authenticated, anon;
GRANT UPDATE (shop_name, address, gst_number, upi_id, workshop_size) ON workshops TO authenticated;

-- Verify on staging, as an authenticated user (see test_rls.sql for the role setup):
--   UPDATE workshops SET subscription_status = 'active';   -- must fail: permission denied
--   UPDATE workshops SET shop_name = 'Test';                -- must succeed
