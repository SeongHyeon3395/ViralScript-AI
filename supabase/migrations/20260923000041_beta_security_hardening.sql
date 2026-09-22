-- Final beta security hardening.
-- Browser clients authenticate with the application API; privileged database
-- functions are executable only by the trusted service role.

-- ---------------------------------------------------------------------------
-- Email recovery: private, rate-limited server boundary
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_recovery_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_hash TEXT NOT NULL,
  lookup_hash TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_recovery_attempts_requester_idx
  ON public.email_recovery_attempts (requester_hash, attempted_at DESC);
CREATE INDEX IF NOT EXISTS email_recovery_attempts_lookup_idx
  ON public.email_recovery_attempts (lookup_hash, attempted_at DESC);

ALTER TABLE public.email_recovery_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_recovery_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.email_recovery_attempts TO service_role;

DROP FUNCTION IF EXISTS public.find_email_by_phone(TEXT, TEXT, TEXT);
CREATE FUNCTION public.find_email_by_phone_server(
  p_full_name TEXT,
  p_phone_country_code TEXT,
  p_phone_number TEXT,
  p_requester_hash TEXT,
  p_lookup_hash TEXT
)
RETURNS TABLE (masked_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_phone TEXT := regexp_replace(coalesce(p_phone_number, ''), '[^0-9]', '', 'g');
BEGIN
  IF char_length(trim(coalesce(p_full_name, ''))) = 0
     OR char_length(v_phone) < 6
     OR p_phone_country_code !~ '^\+[0-9]{1,4}$'
     OR char_length(coalesce(p_requester_hash, '')) <> 64
     OR char_length(coalesce(p_lookup_hash, '')) <> 64 THEN
    RAISE EXCEPTION 'INVALID_RECOVERY_REQUEST';
  END IF;

  -- Serialize requests from the same source so parallel attempts cannot bypass
  -- the rolling-window limit.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_requester_hash, 0));

  IF (SELECT count(*) FROM public.email_recovery_attempts
      WHERE requester_hash = p_requester_hash
        AND attempted_at >= now() - interval '15 minutes') >= 5
     OR (SELECT count(*) FROM public.email_recovery_attempts
         WHERE lookup_hash = p_lookup_hash
           AND attempted_at >= now() - interval '15 minutes') >= 3 THEN
    RAISE EXCEPTION 'EMAIL_RECOVERY_RATE_LIMITED';
  END IF;

  INSERT INTO public.email_recovery_attempts (requester_hash, lookup_hash)
  VALUES (p_requester_hash, p_lookup_hash);

  RETURN QUERY
  SELECT concat(
    left(split_part(p.email, '@', 1), least(3, length(split_part(p.email, '@', 1)))),
    '***@',
    split_part(p.email, '@', 2)
  )
  FROM public.profiles AS p
  WHERE lower(trim(p.full_name)) = lower(trim(p_full_name))
    AND regexp_replace(coalesce(p.phone_number, ''), '[^0-9]', '', 'g') = v_phone
    AND p.phone_country_code = trim(p_phone_country_code)
  LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.find_email_by_phone_server(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_email_by_phone_server(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Self-service profile operations: explicit user id supplied only by server
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT);
CREATE FUNCTION public.update_user_settings_server(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_theme_preference TEXT DEFAULT NULL,
  p_default_language TEXT DEFAULT NULL,
  p_email_notifications BOOLEAN DEFAULT NULL,
  p_default_target_platform TEXT DEFAULT NULL,
  p_phone_country_code TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before public.profiles%ROWTYPE;
  v_after public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_full_name IS NOT NULL AND char_length(p_full_name) > 100 THEN RAISE EXCEPTION 'FULL_NAME_TOO_LONG'; END IF;
  IF p_theme_preference IS NOT NULL AND p_theme_preference NOT IN ('dark', 'light', 'system') THEN RAISE EXCEPTION 'INVALID_THEME'; END IF;
  IF p_default_language IS NOT NULL AND p_default_language NOT IN ('ko', 'en', 'ja', 'zh') THEN RAISE EXCEPTION 'INVALID_LANGUAGE'; END IF;
  IF p_default_target_platform IS NOT NULL AND p_default_target_platform NOT IN ('tiktok', 'youtube') THEN RAISE EXCEPTION 'INVALID_PLATFORM'; END IF;
  IF (p_phone_country_code IS NULL) <> (p_phone_number IS NULL) THEN RAISE EXCEPTION 'PHONE_FIELDS_REQUIRED_TOGETHER'; END IF;
  IF p_phone_country_code IS NOT NULL
     AND (p_phone_country_code !~ '^\+[0-9]{1,4}$' OR p_phone_number !~ '^[0-9]{6,20}$') THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;

  SELECT * INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;

  UPDATE public.profiles SET
    full_name = coalesce(p_full_name, full_name),
    theme_preference = coalesce(p_theme_preference, theme_preference),
    default_language = coalesce(p_default_language, default_language),
    email_notifications = coalesce(p_email_notifications, email_notifications),
    default_target_platform = coalesce(p_default_target_platform, default_target_platform),
    phone_country_code = coalesce(p_phone_country_code, phone_country_code),
    phone_number = coalesce(p_phone_number, phone_number),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_after;

  IF (v_before.full_name, v_before.theme_preference, v_before.default_language, v_before.email_notifications, v_before.default_target_platform)
     IS DISTINCT FROM
     (v_after.full_name, v_after.theme_preference, v_after.default_language, v_after.email_notifications, v_after.default_target_platform) THEN
    INSERT INTO public.user_activity_logs (user_id, action, target_type, target_id, before_data, after_data)
    VALUES (p_user_id, 'profile.update', 'profile', p_user_id,
      jsonb_build_object('full_name', v_before.full_name, 'theme_preference', v_before.theme_preference, 'default_language', v_before.default_language, 'email_notifications', v_before.email_notifications, 'default_target_platform', v_before.default_target_platform),
      jsonb_build_object('full_name', v_after.full_name, 'theme_preference', v_after.theme_preference, 'default_language', v_after.default_language, 'email_notifications', v_after.email_notifications, 'default_target_platform', v_after.default_target_platform));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_user_settings_server(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_settings_server(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) TO service_role;

DROP FUNCTION IF EXISTS public.complete_google_profile(TEXT, TEXT, TEXT);
CREATE FUNCTION public.complete_google_profile_server(
  p_user_id UUID,
  p_phone_country_code TEXT,
  p_phone_number TEXT,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referral_code TEXT := upper(btrim(coalesce(p_referral_code, '')));
  v_referrer_id UUID;
  v_created_event UUID;
  v_credits INTEGER;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_phone_country_code IS NULL OR p_phone_number IS NULL
     OR p_phone_country_code !~ '^\+[0-9]{1,4}$'
     OR p_phone_number !~ '^[0-9]{6,20}$' THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;
  IF v_referral_code <> '' AND v_referral_code !~ '^[A-F0-9]{12}$' THEN
    RAISE EXCEPTION 'INVALID_REFERRAL_CODE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p_user_id AND u.raw_app_meta_data->>'provider' = 'google'
  ) THEN RAISE EXCEPTION 'GOOGLE_ACCOUNT_REQUIRED'; END IF;

  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;

  UPDATE public.profiles
  SET phone_country_code = p_phone_country_code,
      phone_number = p_phone_number,
      updated_at = now()
  WHERE id = p_user_id AND phone_number IS NULL;

  IF v_referral_code <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = p_user_id AND u.created_at >= now() - interval '24 hours'
    ) THEN RAISE EXCEPTION 'REFERRAL_WINDOW_EXPIRED'; END IF;

    SELECT id INTO v_referrer_id FROM public.profiles
    WHERE referral_code = v_referral_code AND id <> p_user_id;
    IF v_referrer_id IS NULL THEN RAISE EXCEPTION 'INVALID_REFERRAL_CODE'; END IF;

    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, referral_code)
    VALUES (v_referrer_id, p_user_id, v_referral_code)
    ON CONFLICT (referred_user_id) DO NOTHING
    RETURNING id INTO v_created_event;

    IF v_created_event IS NOT NULL THEN
      UPDATE public.profiles SET credits_remaining = credits_remaining + 3, updated_at = now()
      WHERE id = v_referrer_id;
      UPDATE public.profiles SET credits_remaining = credits_remaining + 3, updated_at = now()
      WHERE id = p_user_id;
    END IF;
  END IF;

  SELECT credits_remaining INTO v_credits FROM public.profiles WHERE id = p_user_id;
  RETURN v_credits;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_google_profile_server(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_google_profile_server(UUID, TEXT, TEXT, TEXT) TO service_role;

DROP FUNCTION IF EXISTS public.delete_user_account();
CREATE FUNCTION public.delete_user_account_server(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT lower(trim(email)) INTO v_email
  FROM auth.users WHERE id = p_user_id FOR UPDATE;
  IF v_email IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  INSERT INTO public.deleted_accounts (email, deleted_at)
  VALUES (v_email, now())
  ON CONFLICT (email) DO UPDATE SET deleted_at = excluded.deleted_at;

  DELETE FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_DELETE_FAILED'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user_account_server(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account_server(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- Master operation is already called by a service-role API route.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.master_manage_trends_with_audit(
  p_actor_id UUID,
  p_action TEXT,
  p_trend_ids UUID[] DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_ids UUID[];
BEGIN
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_actor_id AND role = 'master' AND is_active) THEN RAISE EXCEPTION 'MASTER_REQUIRED'; END IF;
  IF p_action NOT IN ('delete', 'restore', 'purge') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  IF p_action <> 'purge' AND (p_trend_ids IS NULL OR cardinality(p_trend_ids) = 0) THEN RAISE EXCEPTION 'TREND_IDS_REQUIRED'; END IF;
  IF p_trend_ids IS NOT NULL AND cardinality(p_trend_ids) > 100 THEN RAISE EXCEPTION 'TOO_MANY_TRENDS'; END IF;
  SELECT array_agg(DISTINCT value) INTO v_ids FROM unnest(coalesce(p_trend_ids, ARRAY[]::uuid[])) AS value;

  IF p_action = 'delete' THEN
    UPDATE public.trend_feed SET deleted_at = now(), deleted_by = p_actor_id, delete_reason = coalesce(nullif(left(trim(p_reason), 500), ''), '관리자 삭제')
    WHERE id = ANY(v_ids) AND deleted_at IS NULL;
  ELSIF p_action = 'restore' THEN
    UPDATE public.trend_feed SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
    WHERE id = ANY(v_ids) AND deleted_at IS NOT NULL;
  ELSIF p_trend_ids IS NULL OR cardinality(p_trend_ids) = 0 THEN
    DELETE FROM public.trend_feed WHERE deleted_at IS NOT NULL;
  ELSE
    DELETE FROM public.trend_feed WHERE id = ANY(v_ids) AND deleted_at IS NOT NULL;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'NO_ELIGIBLE_TRENDS'; END IF;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, target_type, target_id, before_data, after_data, reason)
  VALUES (p_actor_id, 'trend.' || p_action || CASE WHEN v_count > 1 OR p_trend_ids IS NULL THEN '_bulk' ELSE '' END,
    'trend_feed', NULL, NULL, jsonb_build_object('count', v_count, 'trend_ids', coalesce(to_jsonb(v_ids), '[]'::jsonb)), nullif(left(trim(p_reason), 500), ''));
  RETURN jsonb_build_object('count', v_count, 'action', p_action);
END;
$$;
REVOKE ALL ON FUNCTION public.master_manage_trends_with_audit(UUID, TEXT, UUID[], TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.master_manage_trends_with_audit(UUID, TEXT, UUID[], TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Function search paths and direct execute privileges
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.get_required_credits(INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_user_credits(UUID, INTEGER, TEXT, TEXT, NUMERIC, NUMERIC) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_cache() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_daily_ad_watch_count(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.deduct_dynamic_credit(UUID, INTEGER) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_daily_ad_watch_count(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_ad_watch_count(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;

-- ---------------------------------------------------------------------------
-- RLS policy correctness and query planning
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_settings_select_own ON public.profiles;

DROP POLICY IF EXISTS "Users can view own history" ON public.user_generation_history;
CREATE POLICY "Users can view own history" ON public.user_generation_history
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own history" ON public.user_generation_history;
CREATE POLICY "Users can insert own history" ON public.user_generation_history
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own history" ON public.user_generation_history;
CREATE POLICY "Users can delete own history" ON public.user_generation_history
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own billing" ON public.billing_transactions;
CREATE POLICY "Users can view own billing" ON public.billing_transactions
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own agreements" ON public.user_agreements;
CREATE POLICY "Users can view own agreements" ON public.user_agreements
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own ad logs" ON public.ad_reward_logs;
CREATE POLICY "Users can view their own ad logs" ON public.ad_reward_logs
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role can insert daily rewards" ON public.daily_reward_logs;
DROP POLICY IF EXISTS "Users can view own daily rewards" ON public.daily_reward_logs;
CREATE POLICY "Users can view own daily rewards" ON public.daily_reward_logs
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON TABLE public.daily_reward_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.daily_reward_logs TO service_role;

-- ---------------------------------------------------------------------------
-- Function correctness fixes reported by the database linter
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_bonus(
  target_user_id UUID,
  bonus_credits INT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  last_spin TIMESTAMPTZ;
  roll NUMERIC;
  awarded_credits INT;
BEGIN
  IF bonus_credits IS NOT NULL THEN RAISE EXCEPTION 'CLIENT_BONUS_NOT_ALLOWED'; END IF;

  SELECT last_roulette_spin_at INTO last_spin
  FROM public.profiles WHERE id = target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF last_spin IS NOT NULL AND last_spin > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'ERR_DAILY_BONUS_ALREADY_CLAIMED';
  END IF;

  roll := random() * 100;
  awarded_credits := CASE
    WHEN roll < 95.00 THEN 1
    WHEN roll < 97.50 THEN 2
    WHEN roll < 98.80 THEN 3
    WHEN roll < 99.60 THEN 4
    ELSE 5
  END;

  INSERT INTO public.daily_reward_logs (user_id, credits) VALUES (target_user_id, awarded_credits);
  UPDATE public.profiles
  SET credits_remaining = credits_remaining + awarded_credits,
      last_roulette_spin_at = now(),
      updated_at = now()
  WHERE id = target_user_id;
  RETURN awarded_credits;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_daily_bonus(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus(UUID, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_verified_payment_order(
  p_order_id TEXT,
  p_provider TEXT,
  p_payment_key TEXT,
  p_amount_krw NUMERIC,
  p_amount_usd NUMERIC
)
RETURNS TABLE (already_paid BOOLEAN, credits_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
  v_credits_remaining INTEGER;
BEGIN
  SELECT * INTO v_order FROM public.payment_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_ORDER_NOT_FOUND'; END IF;
  IF v_order.provider <> p_provider THEN RAISE EXCEPTION 'PAYMENT_PROVIDER_MISMATCH'; END IF;
  IF v_order.status = 'paid' THEN
    RETURN QUERY SELECT true, p.credits_remaining FROM public.profiles AS p WHERE p.id = v_order.user_id;
    RETURN;
  END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'PAYMENT_ORDER_NOT_PENDING'; END IF;
  IF v_order.expected_amount_krw <> p_amount_krw THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH'; END IF;
  IF v_order.payment_key IS NOT NULL AND v_order.payment_key <> p_payment_key THEN RAISE EXCEPTION 'PAYMENT_KEY_MISMATCH'; END IF;
  IF nullif(btrim(p_payment_key), '') IS NULL THEN RAISE EXCEPTION 'PAYMENT_KEY_REQUIRED'; END IF;

  UPDATE public.profiles AS p
  SET credits_remaining = p.credits_remaining + v_order.expected_credits,
      updated_at = now()
  WHERE p.id = v_order.user_id
  RETURNING p.credits_remaining INTO v_credits_remaining;
  IF v_credits_remaining IS NULL THEN RAISE EXCEPTION 'PAYMENT_USER_NOT_FOUND'; END IF;

  INSERT INTO public.billing_transactions (user_id, pg_provider, transaction_id, amount_krw, amount_usd, credits_added, status)
  VALUES (v_order.user_id, v_order.provider, p_payment_key, p_amount_krw, p_amount_usd, v_order.expected_credits, 'success');
  UPDATE public.payment_orders SET status = 'paid', payment_key = p_payment_key, paid_at = now(), updated_at = now()
  WHERE id = v_order.id;

  already_paid := false;
  credits_remaining := v_credits_remaining;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_verified_payment_order(TEXT, TEXT, TEXT, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_payment_order(TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.master_update_user_with_audit(
  p_actor_id UUID,
  p_target_id UUID,
  p_patch JSONB,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role TEXT;
  v_before public.profiles%ROWTYPE;
  v_after public.profiles%ROWTYPE;
BEGIN
  SELECT role INTO v_actor_role FROM public.admin_users WHERE user_id = p_actor_id AND is_active = true FOR SHARE;
  IF v_actor_role <> 'master' THEN RAISE EXCEPTION 'MASTER_ROLE_REQUIRED'; END IF;
  IF p_target_id = p_actor_id AND (p_patch ? 'subscription_plan' OR p_patch ? 'credits_remaining' OR p_patch ? 'is_suspended') THEN
    RAISE EXCEPTION 'CANNOT_CHANGE_OWN_SENSITIVE_ACCOUNT_FIELDS';
  END IF;
  SELECT * INTO v_before FROM public.profiles WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  UPDATE public.profiles SET
    full_name = CASE WHEN p_patch ? 'full_name' THEN nullif(left(btrim(p_patch->>'full_name'), 100), '') ELSE full_name END,
    subscription_plan = CASE WHEN p_patch ? 'subscription_plan' THEN p_patch->>'subscription_plan' ELSE subscription_plan END,
    credits_remaining = CASE WHEN p_patch ? 'credits_remaining' THEN (p_patch->>'credits_remaining')::INTEGER ELSE credits_remaining END,
    theme_preference = CASE WHEN p_patch ? 'theme_preference' THEN p_patch->>'theme_preference' ELSE theme_preference END,
    default_language = CASE WHEN p_patch ? 'default_language' THEN p_patch->>'default_language' ELSE default_language END,
    email_notifications = CASE WHEN p_patch ? 'email_notifications' THEN (p_patch->>'email_notifications')::BOOLEAN ELSE email_notifications END,
    default_target_platform = CASE WHEN p_patch ? 'default_target_platform' THEN p_patch->>'default_target_platform' ELSE default_target_platform END,
    is_suspended = CASE WHEN p_patch ? 'is_suspended' THEN (p_patch->>'is_suspended')::BOOLEAN ELSE is_suspended END,
    suspended_at = CASE WHEN p_patch ? 'is_suspended' AND (p_patch->>'is_suspended')::BOOLEAN THEN now() WHEN p_patch ? 'is_suspended' THEN NULL ELSE suspended_at END,
    suspension_reason = CASE WHEN p_patch ? 'is_suspended' AND (p_patch->>'is_suspended')::BOOLEAN THEN nullif(left(btrim(coalesce(p_reason, '')), 500), '') ELSE CASE WHEN p_patch ? 'is_suspended' THEN NULL ELSE suspension_reason END END,
    updated_at = now()
  WHERE id = p_target_id RETURNING * INTO v_after;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, target_type, target_id, before_data, after_data, reason)
  VALUES (p_actor_id, CASE WHEN p_patch ? 'is_suspended' AND (p_patch->>'is_suspended')::BOOLEAN THEN 'user.suspend' WHEN p_patch ? 'is_suspended' THEN 'user.restore' ELSE 'user.update' END,
    'user', p_target_id::TEXT,
    jsonb_build_object('id', v_before.id, 'email', v_before.email, 'full_name', v_before.full_name, 'subscription_plan', v_before.subscription_plan, 'credits_remaining', v_before.credits_remaining, 'is_suspended', v_before.is_suspended),
    jsonb_build_object('id', v_after.id, 'email', v_after.email, 'full_name', v_after.full_name, 'subscription_plan', v_after.subscription_plan, 'credits_remaining', v_after.credits_remaining, 'is_suspended', v_after.is_suspended),
    nullif(left(btrim(coalesce(p_reason, '')), 500), ''));
  RETURN jsonb_build_object('id', v_after.id, 'email', v_after.email, 'full_name', v_after.full_name, 'subscription_plan', v_after.subscription_plan, 'credits_remaining', v_after.credits_remaining, 'theme_preference', v_after.theme_preference, 'default_language', v_after.default_language, 'email_notifications', v_after.email_notifications, 'default_target_platform', v_after.default_target_platform, 'is_suspended', v_after.is_suspended, 'suspended_at', v_after.suspended_at, 'suspension_reason', v_after.suspension_reason, 'created_at', v_after.created_at, 'updated_at', v_after.updated_at);
END;
$$;
REVOKE ALL ON FUNCTION public.master_update_user_with_audit(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.master_update_user_with_audit(UUID, UUID, JSONB, TEXT) TO service_role;

-- Missing foreign-key indexes reported by the performance advisor.
CREATE INDEX IF NOT EXISTS support_inquiries_handled_by_idx
  ON public.support_inquiries (handled_by) WHERE handled_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS trend_feed_deleted_by_idx
  ON public.trend_feed (deleted_by) WHERE deleted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_agreements_user_id_idx
  ON public.user_agreements (user_id);
