-- 016_create_voice_sessions.sql

CREATE TYPE voice_engine AS ENUM ('sarvam_saarika_v2', 'expo_speech_totext');

CREATE TABLE voice_sessions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id       UUID          NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  job_card_id       UUID          REFERENCES job_cards(id) ON DELETE SET NULL,
  audio_storage_url TEXT,         -- Supabase Storage signed URL; deleted after 24hrs by a scheduled job
  transcript        TEXT,
  confidence        NUMERIC(4,3), -- 0.000–1.000
  engine            voice_engine  NOT NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_sessions_workshop_id ON voice_sessions(workshop_id);

COMMENT ON COLUMN voice_sessions.audio_storage_url IS 'Audio file itself must be deleted from Supabase Storage after 24hrs (PKG-030 cost/retention control) — this column may briefly point to a now-deleted object; treat NULL/404 as expected, not an error.';
