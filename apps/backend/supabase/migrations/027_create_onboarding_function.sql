-- 027_create_onboarding_function.sql
--
-- PKG-018 — Workshop Onboarding Flow. All 6 steps run inside one Postgres
-- function so they succeed or roll back together — this is the real
-- mechanism behind PKG-011's "transaction helper" (PostgREST itself has no
-- multi-statement client transaction, so atomicity has to live here).
--
-- CORRECTED per founder decision: step 4 generates the referral code via
-- INSERT INTO referral_codes (workshop_id, code) — NOT a workshops column,
-- and NOT the old "MX-" prefix.

CREATE OR REPLACE FUNCTION create_workshop_onboarding(
  p_user_id         UUID,        -- auth.users.id, already created by GoTrue/our OTP flow before this call
  p_phone           VARCHAR(15),
  p_shop_name       TEXT,
  p_owner_name      TEXT,
  p_city            TEXT,
  p_address         TEXT,
  p_gst_number      VARCHAR(20),
  p_invoice_prefix  VARCHAR(10)
)
RETURNS TABLE (workshop_id UUID, referral_code TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_workshop_id UUID;
  v_code        TEXT;
  v_attempt     INTEGER := 0;
  v_max_attempts CONSTANT INTEGER := 5;
BEGIN
  -- Step 1: Create workshop record
  INSERT INTO workshops (phone, shop_name, owner_name, city, address, gst_number, invoice_prefix)
  VALUES (p_phone, p_shop_name, p_owner_name, p_city, p_address, p_gst_number, p_invoice_prefix)
  RETURNING id INTO v_workshop_id;

  -- Step 2: Create user record (role: OWNER)
  INSERT INTO users (id, workshop_id, phone, name, role)
  VALUES (p_user_id, v_workshop_id, p_phone, p_owner_name, 'OWNER');

  -- Step 3: Initialize trial subscription (30 days — workshops.trial_ends_at
  -- is a GENERATED column off created_at, so no explicit write needed there;
  -- this creates the corresponding subscriptions ledger row)
  INSERT INTO subscriptions (workshop_id, status, current_period_start, current_period_end)
  VALUES (v_workshop_id, 'trialing', NOW(), NOW() + INTERVAL '30 days');

  -- Step 4: Generate referral code → referral_codes table (corrected:
  -- was "MX-XXXXXX" on a workshops column; now MM-XXXXX in its own table)
  LOOP
    v_attempt := v_attempt + 1;
    v_code := 'MM-' || (
      SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random() * 31)::int + 1, 1), '')
      FROM generate_series(1, 5)
    );

    BEGIN
      INSERT INTO referral_codes (workshop_id, code) VALUES (v_workshop_id, v_code);
      EXIT; -- success, leave the loop
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= v_max_attempts THEN
        RAISE EXCEPTION 'Referral code generation exhausted % attempts for workshop %', v_max_attempts, v_workshop_id;
      END IF;
      -- otherwise loop again with a new candidate
    END;
  END LOOP;

  -- Step 5: Create audit log entry
  INSERT INTO audit_logs (workshop_id, actor_user_id, action, entity_type, entity_id)
  VALUES (v_workshop_id, p_user_id, 'WORKSHOP_ONBOARDED', 'workshop', v_workshop_id);

  -- Step 6: Log the Day-1 engagement trigger as pending — the actual
  -- WhatsApp send (Day 1 +2hrs) is scheduled by the backend via QStash
  -- immediately after this function returns (QStash scheduling is an
  -- external HTTP call, not something a Postgres function should do
  -- directly); this row lets the notifications/engagement layer confirm
  -- the schedule request actually corresponds to a completed onboarding.
  INSERT INTO notifications (workshop_id, notification_type, channel, status)
  VALUES (v_workshop_id, 'onboarding_d1', 'whatsapp', 'skipped');
  -- status starts 'skipped' with no sent_at; the QStash-triggered send
  -- later updates this same logical event to 'sent' once delivered.

  RETURN QUERY SELECT v_workshop_id, v_code;
END;
$$;

COMMENT ON FUNCTION create_workshop_onboarding IS 'PKG-018. Call via service-role RPC only — this function does not check auth.uid(), it trusts its caller (the /workshop registration endpoint) to have already verified OTP and created the auth user.';
