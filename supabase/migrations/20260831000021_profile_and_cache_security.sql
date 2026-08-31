-- Prevent authenticated clients from mutating billing/security columns directly.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_settings_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP FUNCTION IF EXISTS public.update_user_settings(TEXT, TEXT, BOOLEAN, TEXT);
CREATE FUNCTION public.update_user_settings(
  p_full_name TEXT DEFAULT NULL,
  p_theme_preference TEXT DEFAULT NULL,
  p_default_language TEXT DEFAULT NULL,
  p_email_notifications BOOLEAN DEFAULT NULL,
  p_default_target_platform TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_full_name IS NOT NULL AND char_length(p_full_name) > 100 THEN
    RAISE EXCEPTION 'FULL_NAME_TOO_LONG';
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    theme_preference = COALESCE(p_theme_preference, theme_preference),
    default_language = COALESCE(p_default_language, default_language),
    email_notifications = COALESCE(p_email_notifications, email_notifications),
    default_target_platform = COALESCE(p_default_target_platform, default_target_platform),
    updated_at = NOW()
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;

-- Personalized generation cache is server-only. Authenticated users must use the API.
DROP POLICY IF EXISTS "Authenticated users can read cache" ON public.script_cache;
REVOKE ALL ON TABLE public.script_cache FROM anon, authenticated;
GRANT ALL ON TABLE public.script_cache TO service_role;
