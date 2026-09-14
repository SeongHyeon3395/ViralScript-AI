-- Persistent, per-user referral codes and signup rewards.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12))
WHERE referral_code IS NULL OR BTRIM(referral_code) = '';

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;
ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx
  ON public.profiles (referral_code);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referrer_reward_credits INTEGER NOT NULL DEFAULT 3 CHECK (referrer_reward_credits = 3),
  referred_reward_credits INTEGER NOT NULL DEFAULT 3 CHECK (referred_reward_credits = 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referral_not_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referral_events_referrer_created_idx
  ON public.referral_events (referrer_user_id, created_at DESC);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.referral_events TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
  v_created_event UUID;
  v_code TEXT;
BEGIN
  v_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12));
  INSERT INTO public.profiles (
    id, email, full_name, phone_country_code, phone_number, referral_code
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 100), ''),
    COALESCE(NULLIF(LEFT(NEW.raw_user_meta_data->>'phone_country_code', 8), ''), '+82'),
    NULLIF(LEFT(NEW.raw_user_meta_data->>'phone_number', 30), ''),
    v_code
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone_country_code = COALESCE(EXCLUDED.phone_country_code, public.profiles.phone_country_code),
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    updated_at = NOW();

  v_referral_code := UPPER(LEFT(BTRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')), 12));
  IF v_referral_code <> '' THEN
    SELECT p.id INTO v_referrer_id
    FROM public.profiles p
    WHERE p.referral_code = v_referral_code AND p.id <> NEW.id;

    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO public.referral_events (referrer_user_id, referred_user_id, referral_code)
      VALUES (v_referrer_id, NEW.id, v_referral_code)
      ON CONFLICT (referred_user_id) DO NOTHING
      RETURNING id INTO v_created_event;

      IF v_created_event IS NOT NULL THEN
        UPDATE public.profiles
        SET credits_remaining = credits_remaining + 3, updated_at = NOW()
        WHERE id = v_referrer_id;

        UPDATE public.profiles
        SET credits_remaining = credits_remaining + 3, updated_at = NOW()
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
