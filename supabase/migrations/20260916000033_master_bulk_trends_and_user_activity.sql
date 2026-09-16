-- Keep user-originated profile changes separate from administrator/system audits.
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'profile',
  target_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_activity_logs_user_created_at_idx
  ON public.user_activity_logs(user_id, created_at DESC);
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_activity_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_activity_logs TO service_role;

-- Replace the self-service settings RPC so profile changes and their user audit
-- record commit together. Only non-sensitive profile fields are captured.
CREATE OR REPLACE FUNCTION public.update_user_settings(
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
DECLARE
  v_before public.profiles%ROWTYPE;
  v_after public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_full_name IS NOT NULL AND char_length(p_full_name) > 100 THEN RAISE EXCEPTION 'FULL_NAME_TOO_LONG'; END IF;
  IF p_theme_preference IS NOT NULL AND p_theme_preference NOT IN ('dark', 'light', 'system') THEN RAISE EXCEPTION 'INVALID_THEME'; END IF;
  IF p_default_language IS NOT NULL AND p_default_language NOT IN ('ko', 'en', 'ja', 'zh') THEN RAISE EXCEPTION 'INVALID_LANGUAGE'; END IF;
  IF p_default_target_platform IS NOT NULL AND p_default_target_platform NOT IN ('tiktok', 'youtube') THEN RAISE EXCEPTION 'INVALID_PLATFORM'; END IF;

  SELECT * INTO v_before FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  UPDATE public.profiles SET
    full_name = COALESCE(p_full_name, full_name),
    theme_preference = COALESCE(p_theme_preference, theme_preference),
    default_language = COALESCE(p_default_language, default_language),
    email_notifications = COALESCE(p_email_notifications, email_notifications),
    default_target_platform = COALESCE(p_default_target_platform, default_target_platform),
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
REVOKE ALL ON FUNCTION public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_settings(TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;

-- Bulk trend moderation and its audit record are one transaction. Physical
-- deletion is only permitted for rows already placed in the trash.
CREATE OR REPLACE FUNCTION public.master_manage_trends_with_audit(
  p_actor_id UUID,
  p_action TEXT,
  p_trend_ids UUID[] DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_ids UUID[];
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_actor_id THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_actor_id AND role = 'master' AND is_active) THEN RAISE EXCEPTION 'MASTER_REQUIRED'; END IF;
  IF p_action NOT IN ('delete', 'restore', 'purge') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  IF p_action <> 'purge' AND (p_trend_ids IS NULL OR cardinality(p_trend_ids) = 0) THEN RAISE EXCEPTION 'TREND_IDS_REQUIRED'; END IF;
  IF p_trend_ids IS NOT NULL AND cardinality(p_trend_ids) > 100 THEN RAISE EXCEPTION 'TOO_MANY_TRENDS'; END IF;
  SELECT array_agg(DISTINCT value) INTO v_ids FROM unnest(COALESCE(p_trend_ids, ARRAY[]::uuid[])) AS value;

  IF p_action = 'delete' THEN
    UPDATE public.trend_feed SET deleted_at = now(), deleted_by = p_actor_id, delete_reason = COALESCE(NULLIF(left(trim(p_reason), 500), ''), '관리자 삭제')
    WHERE id = ANY(v_ids) AND deleted_at IS NULL;
  ELSIF p_action = 'restore' THEN
    UPDATE public.trend_feed SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL
    WHERE id = ANY(v_ids) AND deleted_at IS NOT NULL;
  ELSIF p_trend_ids IS NULL OR cardinality(p_trend_ids) = 0 THEN
    DELETE FROM public.trend_feed WHERE deleted_at IS NOT NULL;
  ELSE
    DELETE FROM public.trend_feed WHERE id = ANY(v_ids) AND deleted_at IS NOT NULL;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'NO_ELIGIBLE_TRENDS'; END IF;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, target_type, target_id, before_data, after_data, reason)
  VALUES (p_actor_id, 'trend.' || p_action || CASE WHEN v_count > 1 OR p_trend_ids IS NULL THEN '_bulk' ELSE '' END,
    'trend_feed', NULL, NULL, jsonb_build_object('count', v_count, 'trend_ids', COALESCE(to_jsonb(v_ids), '[]'::jsonb)), NULLIF(left(trim(p_reason), 500), ''));
  RETURN jsonb_build_object('count', v_count, 'action', p_action);
END;
$$;
REVOKE ALL ON FUNCTION public.master_manage_trends_with_audit(UUID, TEXT, UUID[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.master_manage_trends_with_audit(UUID, TEXT, UUID[], TEXT) TO authenticated;
