-- 광고 보상 정책: 1회 시청당 1크레딧, 일일 최대 5회.
ALTER TABLE public.ad_reward_logs
  ALTER COLUMN rewarded_credits SET DEFAULT 1;

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
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  SELECT COUNT(*) INTO daily_count
  FROM public.ad_reward_logs
  WHERE user_id = target_user_id
    AND watched_at >= timezone('utc'::text, date_trunc('day', now()));

  IF daily_count >= 5 THEN RAISE EXCEPTION 'ERR_DAILY_AD_LIMIT_EXCEEDED'; END IF;

  INSERT INTO public.ad_reward_logs (user_id, ad_unit_id, rewarded_credits)
  VALUES (target_user_id, left(coalesce(nullif(target_ad_unit_id, ''), 'unknown'), 200), 1);

  UPDATE public.profiles
  SET credits_remaining = credits_remaining + 1, updated_at = now()
  WHERE id = target_user_id
  RETURNING credits_remaining INTO current_credits;

  RETURN current_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO authenticated, service_role;