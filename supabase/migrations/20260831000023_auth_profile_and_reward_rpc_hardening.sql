-- Keep the migrations as the source of truth for signup metadata and email recovery.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+82',
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles (phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_country_phone ON public.profiles (phone_country_code, phone_number);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone_country_code, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 100), ''),
    COALESCE(NULLIF(LEFT(NEW.raw_user_meta_data->>'phone_country_code', 8), ''), '+82'),
    NULLIF(LEFT(NEW.raw_user_meta_data->>'phone_number', 30), '')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.find_email_by_phone(p_full_name TEXT, p_phone_country_code TEXT, p_phone_number TEXT)
RETURNS TABLE (email TEXT, masked_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_phone TEXT := REGEXP_REPLACE(COALESCE(p_phone_number, ''), '[^\d]', '', 'g');
BEGIN
  IF char_length(TRIM(COALESCE(p_full_name, ''))) = 0 OR char_length(v_phone) < 6 THEN RETURN; END IF;
  RETURN QUERY SELECT p.email,
    CONCAT(LEFT(SPLIT_PART(p.email, '@', 1), LEAST(3, LENGTH(SPLIT_PART(p.email, '@', 1)))), '***@', SPLIT_PART(p.email, '@', 2))
  FROM public.profiles p
  WHERE LOWER(TRIM(p.full_name)) = LOWER(TRIM(p_full_name))
    AND REGEXP_REPLACE(COALESCE(p.phone_number, ''), '[^\d]', '', 'g') = v_phone
    AND (p_phone_country_code IS NULL OR p.phone_country_code = TRIM(p_phone_country_code))
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_email_by_phone(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_email_by_phone(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- Reward mutation functions are invoked only through authenticated server routes.
REVOKE ALL ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.claim_daily_bonus(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus(UUID, INTEGER) TO service_role;