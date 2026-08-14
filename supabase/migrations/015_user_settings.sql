-- ============================================================
-- 015_user_settings.sql
-- profiles 테이블에 사용자 개인 설정 컬럼 추가
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference        TEXT    NOT NULL DEFAULT 'dark'
    CHECK (theme_preference IN ('dark', 'light', 'system')),
  ADD COLUMN IF NOT EXISTS default_language        TEXT    NOT NULL DEFAULT 'ko'
    CHECK (default_language IN ('ko', 'en', 'ja', 'zh')),
  ADD COLUMN IF NOT EXISTS email_notifications     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_target_platform TEXT    NOT NULL DEFAULT 'tiktok'
    CHECK (default_target_platform IN ('tiktok', 'youtube', 'instagram'));

-- ─── RLS 정책: 본인 row 조회/수정만 허용 ─────────────────────────
-- (기존 RLS가 이미 활성화 + SELECT/UPDATE 정책이 있으면 중복 방지)
DO $$
BEGIN
  -- SELECT 정책이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'profiles_settings_select_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY profiles_settings_select_own ON public.profiles
        FOR SELECT USING (auth.uid() = id)
    $pol$;
  END IF;

  -- UPDATE 정책이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'profiles_settings_update_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY profiles_settings_update_own ON public.profiles
        FOR UPDATE USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id)
    $pol$;
  END IF;
END$$;

-- ─── 설정 저장 RPC (SECURITY DEFINER 우회 없이 직접 UPDATE) ────────
CREATE OR REPLACE FUNCTION public.update_user_settings(
  p_theme_preference        TEXT DEFAULT NULL,
  p_default_language        TEXT DEFAULT NULL,
  p_email_notifications     BOOLEAN DEFAULT NULL,
  p_default_target_platform TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    theme_preference        = COALESCE(p_theme_preference,        theme_preference),
    default_language        = COALESCE(p_default_language,        default_language),
    email_notifications     = COALESCE(p_email_notifications,     email_notifications),
    default_target_platform = COALESCE(p_default_target_platform, default_target_platform),
    updated_at              = NOW()
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_settings(TEXT, TEXT, BOOLEAN, TEXT)
  TO authenticated;
