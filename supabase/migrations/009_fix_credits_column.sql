-- ================================================================
-- Migration 009: credits 컬럼명 불일치 수정 + 데일리 보너스 RPC
-- profiles 테이블은 credits_remaining 컬럼을 사용하므로
-- 003/004 마이그레이션의 RPC가 credits를 참조하던 버그를 수정
-- ================================================================

-- ─── 광고 보상 RPC 수정: credits → credits_remaining ──────────
CREATE OR REPLACE FUNCTION public.claim_credit_via_ad(
    target_user_id    UUID,
    target_ad_unit_id TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_count     INT;
    current_credits INT;
BEGIN
    SELECT COUNT(*) INTO daily_count
    FROM public.ad_reward_logs
    WHERE user_id  = target_user_id
      AND watched_at >= timezone('utc'::text, date_trunc('day', now()));

    IF daily_count >= 5 THEN
        RAISE EXCEPTION 'ERR_DAILY_AD_LIMIT_EXCEEDED';
    END IF;

    INSERT INTO public.ad_reward_logs (user_id, ad_unit_id, rewarded_credits)
    VALUES (target_user_id, target_ad_unit_id, 3);

    UPDATE public.profiles
    SET credits_remaining = credits_remaining + 3,
        updated_at        = timezone('utc'::text, now())
    WHERE id = target_user_id;

    SELECT credits_remaining INTO current_credits
    FROM public.profiles
    WHERE id = target_user_id;

    RETURN current_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO service_role;

-- ─── 동적 크레딧 차감 RPC 수정: credits → credits_remaining ───
CREATE OR REPLACE FUNCTION public.deduct_dynamic_credit(
    target_user_id UUID,
    video_duration  INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    required_credits INT;
    current_credits  INT;
BEGIN
    IF video_duration <= 15 THEN
        required_credits := 1;
    ELSIF video_duration <= 30 THEN
        required_credits := 3;
    ELSIF video_duration <= 60 THEN
        required_credits := 5;
    ELSE
        required_credits := 8;
    END IF;

    SELECT credits_remaining INTO current_credits
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF current_credits IS NULL OR current_credits < required_credits THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_CREDITS_REQUIRED_%', required_credits;
    END IF;

    UPDATE public.profiles
    SET credits_remaining = credits_remaining - required_credits,
        updated_at        = timezone('utc'::text, now())
    WHERE id = target_user_id;

    RETURN current_credits - required_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_dynamic_credit(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_dynamic_credit(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_dynamic_credit(UUID, INT) TO service_role;

-- ─── 데일리 보너스 RPC (서버에서 원자적 적립) ─────────────────
CREATE TABLE IF NOT EXISTS public.daily_reward_logs (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credits     INT         NOT NULL,
    rewarded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_reward_user_date
    ON public.daily_reward_logs(user_id, rewarded_at);

ALTER TABLE public.daily_reward_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily rewards" ON public.daily_reward_logs;
CREATE POLICY "Users can view own daily rewards"
    ON public.daily_reward_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert daily rewards" ON public.daily_reward_logs;
CREATE POLICY "Service role can insert daily rewards"
    ON public.daily_reward_logs FOR INSERT
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_daily_bonus(
    target_user_id UUID,
    bonus_credits  INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_count     INT;
    current_credits INT;
BEGIN
    -- 오늘(UTC) 이미 수령했는지 확인
    SELECT COUNT(*) INTO today_count
    FROM public.daily_reward_logs
    WHERE user_id    = target_user_id
      AND rewarded_at >= timezone('utc'::text, date_trunc('day', now()));

    IF today_count >= 1 THEN
        RAISE EXCEPTION 'ERR_DAILY_BONUS_ALREADY_CLAIMED';
    END IF;

    IF bonus_credits <= 0 OR bonus_credits > 10 THEN
        RAISE EXCEPTION 'ERR_INVALID_BONUS_AMOUNT';
    END IF;

    INSERT INTO public.daily_reward_logs (user_id, credits)
    VALUES (target_user_id, bonus_credits);

    UPDATE public.profiles
    SET credits_remaining = credits_remaining + bonus_credits,
        updated_at        = timezone('utc'::text, now())
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
