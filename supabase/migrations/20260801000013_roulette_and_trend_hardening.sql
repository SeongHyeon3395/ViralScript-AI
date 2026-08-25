-- ============================================================
-- Migration 013: 서버 추첨 룰렛 및 트렌드 video_url 하드닝
-- ============================================================

ALTER TABLE public.trend_feed
  ADD COLUMN IF NOT EXISTS video_url TEXT;

UPDATE public.trend_feed
SET video_url = url
WHERE video_url IS NULL AND url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_daily_bonus(
    target_user_id UUID,
    bonus_credits  INT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    last_spin       TIMESTAMPTZ;
    today_kst       DATE;
    current_credits INT;
    roll            NUMERIC;
    awarded_credits INT;
BEGIN
    SELECT last_roulette_spin_at, credits_remaining
      INTO last_spin, current_credits
      FROM public.profiles
     WHERE id = target_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND';
    END IF;

    today_kst := (now() AT TIME ZONE 'Asia/Seoul')::DATE;

    IF last_spin IS NOT NULL
       AND (last_spin AT TIME ZONE 'Asia/Seoul')::DATE >= today_kst THEN
        RAISE EXCEPTION 'ERR_DAILY_BONUS_ALREADY_CLAIMED';
    END IF;

    -- 클라이언트가 전달한 bonus_credits는 무시하고 서버에서만 당첨값을 결정한다.
    roll := random() * 100;
    awarded_credits := CASE
        WHEN roll < 70.0 THEN 1
        WHEN roll < 85.0 THEN 2
        WHEN roll < 92.0 THEN 3
        WHEN roll < 95.5 THEN 4
        WHEN roll < 97.5 THEN 5
        WHEN roll < 98.5 THEN 6
        WHEN roll < 99.2 THEN 7
        WHEN roll < 99.6 THEN 8
        WHEN roll < 99.9 THEN 9
        ELSE 10
    END;

    INSERT INTO public.daily_reward_logs (user_id, credits)
    VALUES (target_user_id, awarded_credits);

    UPDATE public.profiles
       SET credits_remaining = credits_remaining + awarded_credits,
           last_roulette_spin_at = now(),
           updated_at = now()
     WHERE id = target_user_id
     RETURNING credits_remaining INTO current_credits;

    RETURN awarded_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_bonus(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_bonus(UUID, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus(UUID, INT) TO service_role;
