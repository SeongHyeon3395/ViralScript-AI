-- Topic-only generation, verified payment orders, safe master mutations, and trend freshness.
-- This migration is additive: it never deletes or rewrites existing user data.

ALTER TABLE public.user_generation_history
  ALTER COLUMN source_url DROP NOT NULL;

-- Empty strings are normalized by execute_script_generation; NULL is the only topic-only value.
CREATE OR REPLACE FUNCTION public.execute_script_generation(
  p_user_id UUID,
  p_source_url TEXT,
  p_project_title TEXT,
  p_target_product TEXT,
  p_generated_json JSONB,
  p_cost INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_current_credits INTEGER;
BEGIN
  IF p_cost IS NULL OR p_cost <= 0 THEN RAISE EXCEPTION 'INVALID_CREDIT_COST'; END IF;
  SELECT credits_remaining INTO v_current_credits FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current_credits IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF v_current_credits < p_cost THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;

  UPDATE public.profiles SET credits_remaining = credits_remaining - p_cost, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.user_generation_history (user_id, source_url, project_title, target_product_name, generated_json, credits_used)
  VALUES (p_user_id, NULLIF(BTRIM(p_source_url), ''), p_project_title, p_target_product, p_generated_json, p_cost);
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) TO service_role;

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'toss')),
  expected_amount_krw NUMERIC(12, 2) NOT NULL CHECK (expected_amount_krw > 0),
  expected_credits INTEGER NOT NULL CHECK (expected_credits > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_payment_key_unique
  ON public.payment_orders(payment_key) WHERE payment_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_orders_user_created_at_idx ON public.payment_orders(user_id, created_at DESC);
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.payment_orders TO service_role;

DROP TRIGGER IF EXISTS trg_payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER trg_payment_orders_updated_at BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- This RPC is callable only by the trusted server after Stripe signature or Toss API verification.
-- The locked order, credit increment, billing transaction and paid state are one PostgreSQL transaction.
CREATE OR REPLACE FUNCTION public.complete_verified_payment_order(
  p_order_id TEXT,
  p_provider TEXT,
  p_payment_key TEXT,
  p_amount_krw NUMERIC,
  p_amount_usd NUMERIC
) RETURNS TABLE (already_paid BOOLEAN, credits_remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_order public.payment_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.payment_orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_ORDER_NOT_FOUND'; END IF;
  IF v_order.provider <> p_provider THEN RAISE EXCEPTION 'PAYMENT_PROVIDER_MISMATCH'; END IF;
  IF v_order.status = 'paid' THEN
    RETURN QUERY SELECT true, p.credits_remaining FROM public.profiles p WHERE p.id = v_order.user_id;
    RETURN;
  END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'PAYMENT_ORDER_NOT_PENDING'; END IF;
  IF v_order.expected_amount_krw <> p_amount_krw THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH'; END IF;
  IF v_order.payment_key IS NOT NULL AND v_order.payment_key <> p_payment_key THEN RAISE EXCEPTION 'PAYMENT_KEY_MISMATCH'; END IF;
  IF NULLIF(BTRIM(p_payment_key), '') IS NULL THEN RAISE EXCEPTION 'PAYMENT_KEY_REQUIRED'; END IF;

  UPDATE public.profiles SET credits_remaining = credits_remaining + v_order.expected_credits, updated_at = now()
  WHERE id = v_order.user_id RETURNING public.profiles.credits_remaining INTO credits_remaining;
  IF credits_remaining IS NULL THEN RAISE EXCEPTION 'PAYMENT_USER_NOT_FOUND'; END IF;

  INSERT INTO public.billing_transactions (user_id, pg_provider, transaction_id, amount_krw, amount_usd, credits_added, status)
  VALUES (v_order.user_id, v_order.provider, p_payment_key, p_amount_krw, p_amount_usd, v_order.expected_credits, 'success');

  UPDATE public.payment_orders SET status = 'paid', payment_key = p_payment_key, paid_at = now(), updated_at = now()
  WHERE id = v_order.id;
  already_paid := false;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_verified_payment_order(TEXT, TEXT, TEXT, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_verified_payment_order(TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO service_role;

ALTER TABLE public.trend_feed ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS trend_feed_platform_video_url_unique
  ON public.trend_feed(platform, video_url) WHERE video_url IS NOT NULL;

-- The route supplies a server-derived patch only. This function rechecks active master status,
-- writes the profile and the safe audit snapshots atomically.
CREATE OR REPLACE FUNCTION public.master_update_user_with_audit(
  p_actor_id UUID,
  p_target_id UUID,
  p_patch JSONB,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_actor_role TEXT; v_target_admin RECORD; v_before public.profiles%ROWTYPE; v_after public.profiles%ROWTYPE;
BEGIN
  SELECT role INTO v_actor_role FROM public.admin_users WHERE user_id = p_actor_id AND is_active = true FOR SHARE;
  IF v_actor_role <> 'master' THEN RAISE EXCEPTION 'MASTER_ROLE_REQUIRED'; END IF;
  SELECT role, is_active INTO v_target_admin FROM public.admin_users WHERE user_id = p_target_id FOR SHARE;
  IF p_target_id = p_actor_id AND (p_patch ? 'subscription_plan' OR p_patch ? 'credits_remaining' OR p_patch ? 'is_suspended') THEN
    RAISE EXCEPTION 'CANNOT_CHANGE_OWN_SENSITIVE_ACCOUNT_FIELDS';
  END IF;
  SELECT * INTO v_before FROM public.profiles WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  UPDATE public.profiles SET
    full_name = CASE WHEN p_patch ? 'full_name' THEN NULLIF(LEFT(BTRIM(p_patch->>'full_name'), 100), '') ELSE full_name END,
    subscription_plan = CASE WHEN p_patch ? 'subscription_plan' THEN p_patch->>'subscription_plan' ELSE subscription_plan END,
    credits_remaining = CASE WHEN p_patch ? 'credits_remaining' THEN (p_patch->>'credits_remaining')::INTEGER ELSE credits_remaining END,
    theme_preference = CASE WHEN p_patch ? 'theme_preference' THEN p_patch->>'theme_preference' ELSE theme_preference END,
    default_language = CASE WHEN p_patch ? 'default_language' THEN p_patch->>'default_language' ELSE default_language END,
    email_notifications = CASE WHEN p_patch ? 'email_notifications' THEN (p_patch->>'email_notifications')::BOOLEAN ELSE email_notifications END,
    default_target_platform = CASE WHEN p_patch ? 'default_target_platform' THEN p_patch->>'default_target_platform' ELSE default_target_platform END,
    is_suspended = CASE WHEN p_patch ? 'is_suspended' THEN (p_patch->>'is_suspended')::BOOLEAN ELSE is_suspended END,
    suspended_at = CASE WHEN p_patch ? 'is_suspended' AND (p_patch->>'is_suspended')::BOOLEAN THEN now() WHEN p_patch ? 'is_suspended' THEN NULL ELSE suspended_at END,
    suspension_reason = CASE WHEN p_patch ? 'is_suspended' AND (p_patch->>'is_suspended')::BOOLEAN THEN NULLIF(LEFT(BTRIM(COALESCE(p_reason, '')), 500), '') ELSE CASE WHEN p_patch ? 'is_suspended' THEN NULL ELSE suspension_reason END END,
    updated_at = now()
  WHERE id = p_target_id RETURNING * INTO v_after;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, target_type, target_id, before_data, after_data, reason)
  VALUES (p_actor_id, CASE WHEN p_patch ? 'is_suspended' AND (p_patch->>'is_suspended')::BOOLEAN THEN 'user.suspend' WHEN p_patch ? 'is_suspended' THEN 'user.restore' ELSE 'user.update' END,
    'user', p_target_id::TEXT,
    jsonb_build_object('id', v_before.id, 'email', v_before.email, 'full_name', v_before.full_name, 'subscription_plan', v_before.subscription_plan, 'credits_remaining', v_before.credits_remaining, 'is_suspended', v_before.is_suspended),
    jsonb_build_object('id', v_after.id, 'email', v_after.email, 'full_name', v_after.full_name, 'subscription_plan', v_after.subscription_plan, 'credits_remaining', v_after.credits_remaining, 'is_suspended', v_after.is_suspended),
    NULLIF(LEFT(BTRIM(COALESCE(p_reason, '')), 500), ''));
  RETURN jsonb_build_object('id', v_after.id, 'email', v_after.email, 'full_name', v_after.full_name, 'subscription_plan', v_after.subscription_plan, 'credits_remaining', v_after.credits_remaining, 'theme_preference', v_after.theme_preference, 'default_language', v_after.default_language, 'email_notifications', v_after.email_notifications, 'default_target_platform', v_after.default_target_platform, 'is_suspended', v_after.is_suspended, 'suspended_at', v_after.suspended_at, 'suspension_reason', v_after.suspension_reason, 'created_at', v_after.created_at, 'updated_at', v_after.updated_at);
END;
$$;
REVOKE ALL ON FUNCTION public.master_update_user_with_audit(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.master_update_user_with_audit(UUID, UUID, JSONB, TEXT) TO service_role;
