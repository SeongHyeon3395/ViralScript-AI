-- 룰렛 보상 확률을 1~5 크레딧으로 제한하고 서버에서만 결정한다.
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

    IF last_spin IS NOT NULL
       AND last_spin > now() - INTERVAL '24 hours' THEN
        RAISE EXCEPTION 'ERR_DAILY_BONUS_ALREADY_CLAIMED';
    END IF;

    -- 1: 95.00%, 2: 2.50%, 3: 1.30%, 4: 0.80%, 5: 0.40%.
    roll := random() * 100;
    awarded_credits := CASE
        WHEN roll < 95.00 THEN 1
        WHEN roll < 97.50 THEN 2
        WHEN roll < 98.80 THEN 3
        WHEN roll < 99.60 THEN 4
        ELSE 5
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
