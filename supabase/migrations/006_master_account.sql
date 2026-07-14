-- ================================================================
-- Migration 006: 마스터 관리자 계정 생성
-- 2026-07-14
-- psunghyi@gmail.com / Sh52315231!?
-- ================================================================

-- Supabase Auth에 수동으로 계정을 생성합니다 (SQL로 직접 삽입 불가)
-- 아래 SQL은 Supabase SQL Editor에서 실행해야 합니다.
-- 또는 Supabase Dashboard → Authentication → Add User → Create User 로 생성

-- profiles 테이블에 마스터 계정 프로필 삽입
-- (auth.users에 계정이 이미 생성된 후 실행해야 함)
INSERT INTO public.profiles (id, email, credits_remaining, created_at, updated_at)
SELECT id, email, 9999, now(), now()
FROM auth.users
WHERE email = 'psunghyi@gmail.com'
ON CONFLICT (id) DO UPDATE SET credits_remaining = 9999;

-- Supabase Auth 에서 수동 추가 방법:
-- 대시보드 → Authentication → Users → Add User
-- Email: psunghyi@gmail.com
-- Password: Sh52315231!?
-- ✅ Auto Confirm User 체크
