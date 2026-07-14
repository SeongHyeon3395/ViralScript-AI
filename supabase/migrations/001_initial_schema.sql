-- ============================================================
-- 글로벌 바이럴 숏폼 로컬라이징 플랫폼 — 초기 스키마 마이그레이션
-- Version: 001 | Date: 2026-07
-- ============================================================

-- 1. 유저 확장 프로필 및 잔여 크레딧 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT NOT NULL,
  subscription_plan   TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'agency')),
  credits_remaining   INTEGER NOT NULL DEFAULT 10 CHECK (credits_remaining >= 0),
  stripe_customer_id  TEXT,
  toss_billing_key    TEXT,
  custom_gemini_key   TEXT,     -- BYOK: 암호화된 사용자 Gemini API 키
  custom_apify_token  TEXT,     -- BYOK: 암호화된 사용자 Apify 토큰
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. URL 분석 결과 글로벌 캐시 테이블
-- SHA-256 해시를 PK로 사용하여 중복 API 호출 원가를 70% 절감
CREATE TABLE IF NOT EXISTS public.script_cache (
  url_hash            TEXT PRIMARY KEY,
  original_url        TEXT NOT NULL,
  platform            TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram')),
  video_duration_sec  INTEGER NOT NULL,
  analysis_result     JSONB NOT NULL,
  hit_count           INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- 3. 유저별 대본 생성 히스토리 테이블 (텍스트/JSON만 보관)
CREATE TABLE IF NOT EXISTS public.user_generation_history (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source_url          TEXT NOT NULL,
  project_title       TEXT NOT NULL,
  target_product_name TEXT NOT NULL,
  generated_json      JSONB NOT NULL,
  credits_used        INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 결제 및 크레딧 충전 트랜잭션 로그
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pg_provider     TEXT NOT NULL CHECK (pg_provider IN ('stripe', 'toss')),
  transaction_id  TEXT NOT NULL UNIQUE,
  amount_krw      NUMERIC(12, 2) NOT NULL,
  amount_usd      NUMERIC(10, 4) NOT NULL,
  credits_added   INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'refunded')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 유저 약관 동의 로그 (법적 방어용 영구 기록)
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tos_version     TEXT NOT NULL,
  ip_address      TEXT NOT NULL,
  user_agent      TEXT,
  agreed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 인덱스 설정 ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_history_user_id
  ON public.user_generation_history (user_id);

CREATE INDEX IF NOT EXISTS idx_user_history_created_at
  ON public.user_generation_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cache_expires_at
  ON public.script_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_cache_platform
  ON public.script_cache (platform);

CREATE INDEX IF NOT EXISTS idx_billing_user_id
  ON public.billing_transactions (user_id);

-- ─── RLS 활성화 ────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- ─── RLS 정책 ─────────────────────────────────────────────────

-- profiles: 본인 데이터만 조회/수정
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- user_generation_history: 본인 생성 내역만 CRUD
CREATE POLICY "Users can view own history"
  ON public.user_generation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON public.user_generation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON public.user_generation_history FOR DELETE
  USING (auth.uid() = user_id);

-- billing_transactions: 본인 결제 내역만 조회 (수정/삭제 불가)
CREATE POLICY "Users can view own billing"
  ON public.billing_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- script_cache: 인증된 모든 유저가 읽기 가능, 쓰기는 Service Role만
CREATE POLICY "Authenticated users can read cache"
  ON public.script_cache FOR SELECT
  TO authenticated
  USING (true);

-- user_agreements: 본인 동의 내역 조회
CREATE POLICY "Users can view own agreements"
  ON public.user_agreements FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 트리거: updated_at 자동 갱신 ────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── 트리거: 신규 유저 가입 시 profiles 자동 생성 ─────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
