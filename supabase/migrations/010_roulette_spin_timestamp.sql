-- ================================================================
-- Migration 010: 룰렛 마지막 스핀 시간 DB 영구 저장
-- profiles 테이블에 last_roulette_spin_at 컬럼 추가
-- claim_daily_bonus RPC에서 해당 컬럼 동시 업데이트
-- ================================================================

-- 1. 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_roulette_spin_at TIMESTAMPTZ;

-- 2. claim_daily_bonus 재정의: 스핀 시간도 profiles에 기록
CREATE OR REPLACE FUNCTION public.claim_daily_bonus(
    target_user_id UUID,
    bonus_credits  INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_spin       TIMESTAMPTZ;
    today_kst       DATE;
    current_credits INT;
BEGIN
    -- KST(UTC+9) 기준 당일 날짜
    today_kst := (now() AT TIME ZONE 'Asia/Seoul')::DATE;

    -- DB에서 마지막 스핀 날짜 확인 (KST 기준)
    SELECT last_roulette_spin_at INTO last_spin
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF last_spin IS NOT NULL AND
       (last_spin AT TIME ZONE 'Asia/Seoul')::DATE >= today_kst THEN
        RAISE EXCEPTION 'ERR_DAILY_BONUS_ALREADY_CLAIMED';
    END IF;

    IF bonus_credits <= 0 OR bonus_credits > 10 THEN
        RAISE EXCEPTION 'ERR_INVALID_BONUS_AMOUNT';
    END IF;

    -- 로그 기록
    INSERT INTO public.daily_reward_logs (user_id, credits)
    VALUES (target_user_id, bonus_credits);

    -- 크레딧 + 스핀 시간 동시 업데이트
    UPDATE public.profiles
    SET credits_remaining    = credits_remaining + bonus_credits,
        last_roulette_spin_at = now(),
        updated_at            = now()
    WHERE id = target_user_id;

    SELECT credits_remaining INTO current_credits
    FROM public.profiles
    WHERE id = target_user_id;

    RETURN current_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_bonus(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus(UUID, INT) TO service_role;
