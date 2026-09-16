-- ============================================================
-- 008_auth_phone_profiles_migration.sql
-- profiles 테이블 컬럼 확장, 안전한 handle_new_user 트리거 및 전화번호 이메일 찾기 RPC
-- ============================================================

-- 1. public.profiles 테이블 컬럼 추가/보완
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+82',
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. phone_number 검색 성능 향상을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number
  ON public.profiles (phone_number);

CREATE INDEX IF NOT EXISTS idx_profiles_country_phone
  ON public.profiles (phone_country_code, phone_number);

-- 3. auth.users 가입 시 raw_user_meta_data에서 full_name, phone_country_code, phone_number를 읽어
-- public.profiles에 안전하게 INSERT 또는 ON CONFLICT UPDATE 처리하는 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_phone_country_code TEXT;
  v_phone_number TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
  v_phone_country_code := COALESCE(NEW.raw_user_meta_data->>'phone_country_code', '+82');
  v_phone_number := NEW.raw_user_meta_data->>'phone_number';

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone_country_code,
    phone_number
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_phone_country_code,
    v_phone_number
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone_country_code = COALESCE(EXCLUDED.phone_country_code, public.profiles.phone_country_code),
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 가입 절차가 500 에러로 중단되지 않도록 예외 처리 후 최소한의 profile 생성 시도
  BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- 무시하여 auth.users 생성을 보호
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재설정
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. [이메일 찾기] 이름 + 국가번호 + 전화번호 기반 이메일 조회 RPC 함수
DROP FUNCTION IF EXISTS public.find_email_by_phone(TEXT, TEXT, TEXT);
CREATE FUNCTION public.find_email_by_phone(
  p_full_name TEXT,
  p_phone_country_code TEXT,
  p_phone_number TEXT
)
RETURNS TABLE (masked_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_phone TEXT;
  v_clean_country TEXT;
BEGIN
  -- 전화번호에서 하이픈, 공백 제거
  v_clean_phone := REGEXP_REPLACE(p_phone_number, '[^\d]', '', 'g');
  v_clean_country := TRIM(p_phone_country_code);

  RETURN QUERY
  SELECT
    CASE 
      WHEN POSITION('@' IN p.email) > 0 THEN
        CONCAT(
          SUBSTRING(SPLIT_PART(p.email, '@', 1) FROM 1 FOR GREATEST(LEAST(LENGTH(SPLIT_PART(p.email, '@', 1)), 3), 1)),
          '***@',
          SPLIT_PART(p.email, '@', 2)
        )
      ELSE '***'
    END AS masked_email
  FROM public.profiles p
  WHERE (p.full_name IS NOT NULL AND LOWER(TRIM(p.full_name)) = LOWER(TRIM(p_full_name)))
    AND REGEXP_REPLACE(COALESCE(p.phone_number, ''), '[^\d]', '', 'g') = v_clean_phone
    AND (p_phone_country_code IS NULL OR p.phone_country_code = v_clean_country)
  LIMIT 1;
END;
$$;

-- anon 및 authenticated 역할에 RPC 실행 권한 부여
REVOKE ALL ON FUNCTION public.find_email_by_phone(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_email_by_phone(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ============================================================
-- Current schema additions (migration 20260914000026)
-- The migration is the executable source of truth for RPC bodies.
-- ============================================================

-- Generation history keeps existing source URLs and permits topic-only generations.
ALTER TABLE public.user_generation_history
  ALTER COLUMN source_url DROP NOT NULL;

-- Server-owned orders are the source of truth for provider, price and credit quantity.
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'toss')),
  expected_amount_krw NUMERIC(12, 2) NOT NULL CHECK (expected_amount_krw > 0),
  expected_credits INTEGER NOT NULL CHECK (expected_credits > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_payment_key_unique
  ON public.payment_orders(payment_key) WHERE payment_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_orders_user_created_at_idx
  ON public.payment_orders(user_id, created_at DESC);
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.payment_orders TO service_role;

-- Trends retain original creation time and separately track the latest collector refresh.
ALTER TABLE public.trend_feed
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.trend_feed
  ADD CONSTRAINT trend_feed_platform_video_url_unique UNIQUE (platform, video_url);

-- Added SECURITY DEFINER RPCs (definitions and grants are in the migration above):
-- public.complete_verified_payment_order(TEXT, TEXT, TEXT, NUMERIC, NUMERIC)
-- public.master_update_user_with_audit(UUID, UUID, JSONB, TEXT)

-- Persistent referral codes are assigned to every profile; signup rewards are
-- inserted and credited atomically by public.handle_new_user() in migration
-- 20260915000027_referrals_and_rewards.sql.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12))
WHERE referral_code IS NULL OR BTRIM(referral_code) = '';
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uidx ON public.profiles(referral_code);
CREATE TABLE IF NOT EXISTS public.referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referrer_reward_credits INTEGER NOT NULL DEFAULT 3 CHECK (referrer_reward_credits = 3),
  referred_reward_credits INTEGER NOT NULL DEFAULT 3 CHECK (referred_reward_credits = 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_not_self CHECK (referrer_user_id <> referred_user_id)
);
CREATE INDEX IF NOT EXISTS referral_events_referrer_created_idx
  ON public.referral_events(referrer_user_id, created_at DESC);
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.referral_events TO service_role;

-- Authenticated support inquiries, added by migration 20260915000028.
CREATE TABLE IF NOT EXISTS public.support_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sender_email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('account', 'billing', 'generation', 'bug', 'feature', 'other', 'suspension_appeal')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_inquiries_created_at_idx ON public.support_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS support_inquiries_category_created_at_idx ON public.support_inquiries (category, created_at DESC);
CREATE INDEX IF NOT EXISTS support_inquiries_user_created_at_idx ON public.support_inquiries (user_id, created_at DESC);
ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_inquiries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.support_inquiries TO service_role;

ALTER TABLE public.support_inquiries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'resolved')),
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
