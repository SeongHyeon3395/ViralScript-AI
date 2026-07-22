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
CREATE OR REPLACE FUNCTION public.find_email_by_phone(
  p_full_name TEXT,
  p_phone_country_code TEXT,
  p_phone_number TEXT
)
RETURNS TABLE (
  email TEXT,
  masked_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    p.email,
    CASE 
      WHEN POSITION('@' IN p.email) > 0 THEN
        CONCAT(
          SUBSTRING(SPLIT_PART(p.email, '@', 1) FROM 1 FOR GREATEST(LEAST(LENGTH(SPLIT_PART(p.email, '@', 1)), 3), 1)),
          '***@',
          SPLIT_PART(p.email, '@', 2)
        )
      ELSE p.email
    END AS masked_email
  FROM public.profiles p
  WHERE (p.full_name IS NOT NULL AND LOWER(TRIM(p.full_name)) = LOWER(TRIM(p_full_name)))
    AND REGEXP_REPLACE(COALESCE(p.phone_number, ''), '[^\d]', '', 'g') = v_clean_phone
    AND (p_phone_country_code IS NULL OR p.phone_country_code IS NULL OR p.phone_country_code = v_clean_country)
  LIMIT 1;
END;
$$;

-- anon 및 authenticated 역할에 RPC 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.find_email_by_phone(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
