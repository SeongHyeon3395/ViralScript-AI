-- Google signups collect a phone number and optional referral on our site.
-- The OAuth provider cannot pass this data into handle_new_user().
CREATE OR REPLACE FUNCTION public.complete_google_profile(
  p_phone_country_code TEXT,
  p_phone_number TEXT,
  p_referral_code TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_referral_code TEXT := upper(btrim(coalesce(p_referral_code, '')));
  v_referrer_id UUID;
  v_created_event UUID;
  v_credits INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_phone_country_code IS NULL OR p_phone_number IS NULL
     OR p_phone_country_code !~ '^\+[0-9]{1,4}$'
     OR p_phone_number !~ '^[0-9]{6,20}$' THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;
  IF v_referral_code <> '' AND v_referral_code !~ '^[A-F0-9]{12}$' THEN
    RAISE EXCEPTION 'INVALID_REFERRAL_CODE';
  END IF;

  -- Only accounts originally created through Google may use this signup flow.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = v_user_id AND u.raw_app_meta_data->>'provider' = 'google'
  ) THEN RAISE EXCEPTION 'GOOGLE_ACCOUNT_REQUIRED'; END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;

  UPDATE public.profiles
  SET phone_country_code = p_phone_country_code,
      phone_number = p_phone_number,
      updated_at = now()
  WHERE id = v_user_id AND phone_number IS NULL;

  IF v_referral_code <> '' THEN
    -- Referral rewards belong to new accounts only. The unique referred_user_id
    -- constraint and profile row lock make retries and concurrent requests safe.
    IF NOT EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = v_user_id AND u.created_at >= now() - interval '24 hours'
    ) THEN RAISE EXCEPTION 'REFERRAL_WINDOW_EXPIRED'; END IF;

    SELECT id INTO v_referrer_id FROM public.profiles
    WHERE referral_code = v_referral_code AND id <> v_user_id;
    IF v_referrer_id IS NULL THEN RAISE EXCEPTION 'INVALID_REFERRAL_CODE'; END IF;

    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, referral_code)
    VALUES (v_referrer_id, v_user_id, v_referral_code)
    ON CONFLICT (referred_user_id) DO NOTHING
    RETURNING id INTO v_created_event;

    IF v_created_event IS NOT NULL THEN
      UPDATE public.profiles SET credits_remaining = credits_remaining + 3, updated_at = now()
      WHERE id = v_referrer_id;
      UPDATE public.profiles SET credits_remaining = credits_remaining + 3, updated_at = now()
      WHERE id = v_user_id;
    END IF;
  END IF;

  SELECT credits_remaining INTO v_credits FROM public.profiles WHERE id = v_user_id;
  RETURN v_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_google_profile(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_google_profile(TEXT, TEXT, TEXT) TO authenticated;
