-- ================================================================
-- Migration 007: OTP 자동 정리 + 이메일 미인증 유저 자동 삭제
-- 2026-07-15 — Email OTP 6자리 인증 시스템
-- ================================================================

-- ─── 정책: 미인증 유저 자동 삭제 (24시간 후) ───
-- Supabase Auth는 기본적으로 email_confirmed_at이 NULL인 유저를
-- 자동으로 삭제하지 않으므로, 주기적 정리를 위한 RPC 함수를 생성합니다.

-- ⚠️ 참고: auth.users 테이블은 Supabase 내부 테이블이므로
-- Service Role 권한으로만 접근 가능합니다.
-- 프로덕션 환경에서는 Supabase 대시보드의 "Database" → "Cron Jobs"에서
-- 아래 RPC를 매일 실행하도록 설정해야 합니다.

CREATE OR REPLACE FUNCTION public.cleanup_unverified_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 24시간 이상 이메일 인증을 하지 않은 유저 삭제
  DELETE FROM auth.users
  WHERE email_confirmed_at IS NULL
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- ─── 권한 설정: Service Role만 실행 가능 ───
REVOKE ALL ON FUNCTION public.cleanup_unverified_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_unverified_users() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_unverified_users() FROM authenticated;

-- ─── 주석: Supabase Cron Job 설정 방법 ───
-- Supabase 대시보드 → Database → Cron Jobs → Add Cron Job
-- 함수: public.cleanup_unverified_users()
-- 스케줄: 0 2 * * * (매일 새벽 2시 UTC)
-- 또는 API Route에서 직접 호출 가능:
-- 
-- import { createAdminClient } from '@/lib/supabase/server';
-- const supabase = createAdminClient();
-- await supabase.rpc('cleanup_unverified_users');
