-- ============================================================
-- Migration 019: 탈퇴 계정 보관 및 30일 재가입 제한
-- ============================================================

-- 탈퇴한 이메일은 30일 동안 재가입을 제한하기 위해 보관한다.
-- 이메일은 대소문자와 앞뒤 공백을 무시하고 비교한다.
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  email      TEXT PRIMARY KEY,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

-- 일반 클라이언트가 탈퇴 기록을 직접 조회하거나 변경하지 못하도록 한다.
REVOKE ALL ON TABLE public.deleted_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deleted_accounts TO service_role;

-- auth.users INSERT 전에 최근 탈퇴 기록을 확인한다.
CREATE OR REPLACE FUNCTION public.check_rejoin_restriction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.deleted_accounts
    WHERE email = LOWER(TRIM(NEW.email))
      AND deleted_at > NOW() - INTERVAL '30 days'
  ) THEN
    RAISE EXCEPTION '탈퇴 후 30일 동안은 재가입할 수 없습니다.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_rejoin_restriction ON auth.users;
CREATE TRIGGER trg_check_rejoin_restriction
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_rejoin_restriction();

-- 현재 로그인한 사용자의 탈퇴 기록을 남긴 뒤 auth.users를 삭제한다.
-- profiles, user_generation_history, ad_reward_logs, daily_reward_logs 등
-- ON DELETE CASCADE 관계 데이터는 auth.users 삭제 시 함께 정리된다.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT LOWER(TRIM(email))
  INTO v_email
  FROM auth.users
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO public.deleted_accounts (email, deleted_at)
  VALUES (v_email, NOW())
  ON CONFLICT (email) DO UPDATE
    SET deleted_at = EXCLUDED.deleted_at;

  DELETE FROM auth.users WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_delete_failed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_rejoin_restriction() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rejoin_restriction() TO service_role;
