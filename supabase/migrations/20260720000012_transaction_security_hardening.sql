-- ============================================================
-- Migration 012: 생성 과금 트랜잭션 및 보상 RPC 보안 하드닝
-- ============================================================

-- SECURITY DEFINER 함수의 search_path 고정: search_path 오염 공격 방지
ALTER FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER)
  SET search_path = public, pg_temp;

-- 생성 RPC는 서버의 service_role만 호출한다. API에서 JWT를 먼저 검증한다.
REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) TO service_role;

-- SECURITY DEFINER 함수가 호출자 전달 ID를 임의로 악용하지 못하도록 입력 검증과
-- row lock을 보강한다. 실패하는 INSERT/UPDATE는 함수 호출 전체를 롤백한다.
CREATE OR REPLACE FUNCTION public.execute_script_generation(
  p_user_id       UUID,
  p_source_url    TEXT,
  p_project_title TEXT,
  p_target_product TEXT,
  p_generated_json JSONB,
  p_cost          INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  IF p_cost IS NULL OR p_cost <= 0 THEN
    RAISE EXCEPTION 'INVALID_CREDIT_COST';
  END IF;

  SELECT credits_remaining INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF v_current_credits < p_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - p_cost,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.user_generation_history (
    user_id, source_url, project_title, target_product_name,
    generated_json, credits_used
  ) VALUES (
    p_user_id, p_source_url, p_project_title, p_target_product,
    p_generated_json, p_cost
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.execute_script_generation(UUID, TEXT, TEXT, TEXT, JSONB, INTEGER) TO service_role;

-- SECURITY DEFINER 광고 보상 RPC도 고정 search_path와 유저 row lock을 사용한다.
-- row lock은 같은 유저의 동시 요청이 일일 5회 제한을 우회하지 못하게 한다.
ALTER FUNCTION public.claim_credit_via_ad(UUID, TEXT)
  SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.claim_credit_via_ad(
  target_user_id UUID,
  target_ad_unit_id TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  daily_count INT;
  current_credits INT;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  SELECT COUNT(*) INTO daily_count
  FROM public.ad_reward_logs
  WHERE user_id = target_user_id
    AND watched_at >= timezone('utc'::text, date_trunc('day', now()));

  IF daily_count >= 5 THEN
    RAISE EXCEPTION 'ERR_DAILY_AD_LIMIT_EXCEEDED';
  END IF;

  INSERT INTO public.ad_reward_logs (user_id, ad_unit_id, rewarded_credits)
  VALUES (target_user_id, left(coalesce(nullif(target_ad_unit_id, ''), 'unknown'), 200), 3);

  UPDATE public.profiles
  SET credits_remaining = credits_remaining + 3,
      updated_at = now()
  WHERE id = target_user_id
  RETURNING credits_remaining INTO current_credits;

  RETURN current_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO service_role;

-- ad_reward_logs는 클라이언트가 직접 INSERT할 수 없어야 한다.
DROP POLICY IF EXISTS "Service role can insert ad logs" ON public.ad_reward_logs;
