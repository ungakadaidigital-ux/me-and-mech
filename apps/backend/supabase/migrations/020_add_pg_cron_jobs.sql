-- 020_add_pg_cron_jobs.sql

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Referral entries past their 7-day success window, still pending → expired.
-- Referenced by PKG-034's Edge Function design as the expiry backstop.
SELECT cron.schedule(
  'referral-entries-expiry-sweep',
  '0 * * * *', -- hourly
  $$
    UPDATE referral_entries
    SET status = 'expired', resolved_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();
  $$
);

-- Day 30 trial → read_only transition. The Day 30/31 grace-period-on-holiday
-- rule (locked decision) is evaluated in application code before this sweep
-- runs in production — this SQL job is the baseline transition; the grace
-- window is applied by adjusting trial_ends_at-derived logic at the API
-- layer, not by changing this cron job's WHERE clause per calendar.
SELECT cron.schedule(
  'trial-to-read-only-sweep',
  '0 * * * *', -- hourly
  $$
    UPDATE workshops
    SET subscription_status = 'read_only'
    WHERE subscription_status = 'trial' AND trial_ends_at < NOW();
  $$
);

-- NOTE: voice_sessions.audio_storage_url objects (Supabase Storage) cannot
-- be deleted via pg_cron SQL alone — that requires a Storage API call.
-- The 24-hour audio deletion job is implemented as a Supabase Edge Function
-- triggered by pg_cron via net.http_post (or a QStash schedule), not as raw
-- SQL here. Tracked as a Part 4/PKG-030 implementation item, not Part 2.
