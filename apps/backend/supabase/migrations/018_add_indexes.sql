-- 018_add_indexes.sql
-- Most indexes are created inline with their table (so a reviewer sees
-- table + its indexes together). This file covers only the handful that
-- span multiple tables or were deferred until dependent tables existed.

CREATE INDEX idx_workshops_subscription_status ON workshops(subscription_status);
CREATE INDEX idx_workshops_trial_ends_at ON workshops(trial_ends_at) WHERE subscription_status = 'trial';
CREATE INDEX idx_invoices_job_card_id ON invoices(job_card_id);
