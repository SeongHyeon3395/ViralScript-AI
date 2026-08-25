-- ================================================================
-- Migration 004: 영상 길이별 다이나믹 크레딧 차감 RPC
-- 작성일: 2026-07
-- 목적: Apify가 리턴한 duration_seconds 기반으로 차등 과금 적용
-- ================================================================
-- 영상 길이 → 크레딧 단가 기준
-- 0~15초   (숏/챌린지)   : 1 크레딧
-- 16~30초  (미드 숏폼)   : 3 크레딧
-- 31~60초  (롱 숏폼)     : 5 크레딧
-- 61초 초과 (미드폼/롱폼) : 8 크레딧
-- ================================================================

CREATE OR REPLACE FUNCTION public.deduct_dynamic_credit(
    target_user_id UUID,
    video_duration  INT  -- Apify에서 받아온 초 단위 영상 길이
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    required_credits INT;
    current_credits  INT;
BEGIN
    -- 1. 영상 길이에 따른 크레딧 차감 기준 결정
    IF video_duration <= 15 THEN
        required_credits := 1;
    ELSIF video_duration <= 30 THEN
        required_credits := 3;
    ELSIF video_duration <= 60 THEN
        required_credits := 5;
    ELSE
        required_credits := 8;
    END IF;

    -- 2. 유저의 현재 잔여 크레딧 조회 (FOR UPDATE로 동시성 충돌 방지)
    SELECT credits INTO current_credits
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    -- 3. 크레딧 부족 시 예외 발생 (필요 크레딧 수량 포함)
    IF current_credits IS NULL OR current_credits < required_credits THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_CREDITS_REQUIRED_%', required_credits;
    END IF;

    -- 4. 원자적 크레딧 차감
    UPDATE public.profiles
    SET credits    = credits - required_credits,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    -- 5. 차감 후 잔여 크레딧 반환
    RETURN current_credits - required_credits;
END;
$$;

-- 실행 권한 설정
REVOKE ALL ON FUNCTION public.deduct_dynamic_credit(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_dynamic_credit(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_dynamic_credit(UUID, INT) TO service_role;

-- ────────────────────────────────────────────────────────────────
-- 조회용 헬퍼: 특정 영상 길이에 필요한 크레딧 수 반환 (프론트엔드용)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_required_credits(video_duration INT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF video_duration <= 15 THEN RETURN 1;
    ELSIF video_duration <= 30 THEN RETURN 3;
    ELSIF video_duration <= 60 THEN RETURN 5;
    ELSE RETURN 8;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_required_credits(INT) TO anon, authenticated, service_role;
