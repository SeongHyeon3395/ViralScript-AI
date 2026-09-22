-- Allow users to view and update their own phone number through the existing
-- restricted settings RPC. Phone values are intentionally excluded from the
-- activity log because it is sensitive profile data.
DROP FUNCTION IF EXISTS public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT);

CREATE FUNCTION public.update_user_settings(
  p_full_name TEXT DEFAULT NULL,
  p_theme_preference TEXT DEFAULT NULL,
  p_default_language TEXT DEFAULT NULL,
  p_email_notifications BOOLEAN DEFAULT NULL,
  p_default_target_platform TEXT DEFAULT NULL,
  p_phone_country_code TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before public.profiles%ROWTYPE;
  v_after public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_full_name IS NOT NULL AND char_length(p_full_name) > 100 THEN RAISE EXCEPTION 'FULL_NAME_TOO_LONG'; END IF;
  IF p_theme_preference IS NOT NULL AND p_theme_preference NOT IN ('dark', 'light', 'system') THEN RAISE EXCEPTION 'INVALID_THEME'; END IF;
  IF p_default_language IS NOT NULL AND p_default_language NOT IN ('ko', 'en', 'ja', 'zh') THEN RAISE EXCEPTION 'INVALID_LANGUAGE'; END IF;
  IF p_default_target_platform IS NOT NULL AND p_default_target_platform NOT IN ('tiktok', 'youtube') THEN RAISE EXCEPTION 'INVALID_PLATFORM'; END IF;
  IF (p_phone_country_code IS NULL) <> (p_phone_number IS NULL) THEN RAISE EXCEPTION 'PHONE_FIELDS_REQUIRED_TOGETHER'; END IF;
  IF p_phone_country_code IS NOT NULL AND (p_phone_country_code !~ '^\+[0-9]{1,4}$' OR p_phone_number !~ '^[0-9]{6,20}$') THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;

  SELECT * INTO v_before FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(p_full_name, full_name),
    theme_preference = COALESCE(p_theme_preference, theme_preference),
    default_language = COALESCE(p_default_language, default_language),
    email_notifications = COALESCE(p_email_notifications, email_notifications),
    default_target_platform = COALESCE(p_default_target_platform, default_target_platform),
    phone_country_code = COALESCE(p_phone_country_code, phone_country_code),
    phone_number = COALESCE(p_phone_number, phone_number),
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO v_after;

  IF (v_before.full_name, v_before.theme_preference, v_before.default_language, v_before.email_notifications, v_before.default_target_platform)
     IS DISTINCT FROM
     (v_after.full_name, v_after.theme_preference, v_after.default_language, v_after.email_notifications, v_after.default_target_platform) THEN
    INSERT INTO public.user_activity_logs (user_id, action, target_type, target_id, before_data, after_data)
    VALUES (auth.uid(), 'profile.update', 'profile', auth.uid(),
      jsonb_build_object('full_name', v_before.full_name, 'theme_preference', v_before.theme_preference, 'default_language', v_before.default_language, 'email_notifications', v_before.email_notifications, 'default_target_platform', v_before.default_target_platform),
      jsonb_build_object('full_name', v_after.full_name, 'theme_preference', v_after.theme_preference, 'default_language', v_after.default_language, 'email_notifications', v_after.email_notifications, 'default_target_platform', v_after.default_target_platform));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) TO authenticated;
