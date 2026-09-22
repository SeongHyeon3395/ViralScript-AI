-- Free beta protection: each account may complete at most three video plans
-- per UTC day. The profile row lock makes this limit safe under concurrent requests.
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
DECLARE
  v_current_credits INTEGER;
  v_daily_generation_count INTEGER;
BEGIN
  IF p_cost IS NULL OR p_cost <= 0 THEN RAISE EXCEPTION 'INVALID_CREDIT_COST'; END IF;

  SELECT credits_remaining INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  IF v_current_credits IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  SELECT COUNT(*) INTO v_daily_generation_count
  FROM public.user_generation_history
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  IF v_daily_generation_count >= 3 THEN RAISE EXCEPTION 'DAILY_GENERATION_LIMIT_REACHED'; END IF;
  IF v_current_credits < p_cost THEN RAISE EXCEPTION 'INSUFFICIENT_CREDITS'; END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - p_cost, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.user_generation_history (user_id, source_url, project_title, target_product_name, generated_json, credits_used)
  VALUES (p_user_id, NULLIF(BTRIM(p_source_url), ''), p_project_title, p_target_product, p_generated_json, p_cost);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) TO service_role;
