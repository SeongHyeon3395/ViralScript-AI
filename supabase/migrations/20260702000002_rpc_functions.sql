-- ============================================================
-- RPC 함수 정의 — 원자적 트랜잭션 보장
-- Version: 002 | Date: 2026-07
-- ============================================================

-- ─── 1. 크레딧 차감 + 히스토리 저장 (원자적 실행) ───────────

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
AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  -- Row Lock: 동시성 Race Condition 방지
  SELECT credits_remaining
  INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- 크레딧 부족 시 명확한 에러 발생 → 트랜잭션 롤백
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF v_current_credits < p_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  -- 1. 크레딧 차감
  UPDATE public.profiles
  SET
    credits_remaining = credits_remaining - p_cost,
    updated_at        = NOW()
  WHERE id = p_user_id;

  -- 2. 히스토리 인서트
  INSERT INTO public.user_generation_history (
    user_id,
    source_url,
    project_title,
    target_product_name,
    generated_json,
    credits_used
  ) VALUES (
    p_user_id,
    p_source_url,
    p_project_title,
    p_target_product,
    p_generated_json,
    p_cost
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE; -- 호출자에게 에러 전파 (롤백 보장)
END;
$$;

-- ─── 2. 크레딧 충전 + 결제 로그 저장 (원자적 실행) ──────────

CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id    UUID,
  p_credits    INTEGER,
  p_provider   TEXT,
  p_tx_id      TEXT,
  p_amount_usd NUMERIC,
  p_amount_krw NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 멱등성 보장: 동일 tx_id 중복 처리 방지
  IF EXISTS (
    SELECT 1 FROM public.billing_transactions WHERE transaction_id = p_tx_id
  ) THEN
    RETURN TRUE; -- 이미 처리된 요청이므로 성공으로 간주
  END IF;

  -- 크레딧 충전
  UPDATE public.profiles
  SET
    credits_remaining = credits_remaining + p_credits,
    updated_at        = NOW()
  WHERE id = p_user_id;

  -- 결제 로그 기록
  INSERT INTO public.billing_transactions (
    user_id,
    pg_provider,
    transaction_id,
    amount_krw,
    amount_usd,
    credits_added,
    status
  ) VALUES (
    p_user_id,
    p_provider,
    p_tx_id,
    p_amount_krw,
    p_amount_usd,
    p_credits,
    'success'
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ─── 3. 만료된 캐시 정리 (스케줄러 호출용) ───────────────────

CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.script_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
