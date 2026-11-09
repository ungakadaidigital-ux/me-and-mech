-- 031_add_engagement_columns.sql
-- Dedup layer 1 (last_reminded_at) and reminder_sequence — each position in
-- the trial/grace reminder chain fires once per subscription cycle only.

ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sequence SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN workshops.reminder_sequence IS 'Position in the current trial/grace WhatsApp reminder chain. Reset to 0 on each new subscription cycle (trial start, or post-payment renewal).';
