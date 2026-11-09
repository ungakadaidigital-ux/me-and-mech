-- 024_drop_legacy_referral_artifacts.sql
--
-- Defensive, idempotent cleanup. In THIS build, the legacy single
-- "referrals" table and the "workshops.referral_code" column were never
-- created (013 is a reserved no-op, and 002_create_workshops.sql never
-- added the column) — so both statements below are no-ops here.
--
-- This migration is kept in the sequence anyway, deliberately written with
-- IF EXISTS, so that:
--   1. The migration history stays identical in shape to what was already
--      communicated and reviewed as part of this project's decision log.
--   2. If this schema is ever applied on top of an environment that DID
--      run an earlier, pre-correction draft (e.g. a stray dev sandbox),
--      running the full migration set remains safe and produces the same
--      end state either way.

DROP TABLE IF EXISTS referrals CASCADE;
ALTER TABLE workshops DROP COLUMN IF EXISTS referral_code;
