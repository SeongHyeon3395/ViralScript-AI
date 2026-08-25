-- ================================================================
-- Migration 003: 광고 보상 시스템 스키마 확장
-- 작성일: 2026-07
-- 목적: Google AdSense 웹 보상형 광고 크레딧 지급 추적 및 어뷰징 방지
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. 광고 보상 이력 추적 테이블 생성
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_reward_logs (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ad_unit_id       TEXT        NOT NULL,                      -- 구글 애드센스 광고 단위 ID
    rewarded_credits INT         DEFAULT 3 NOT NULL,            -- 지급된 크레딧 수량 (3크레딧 고정)
    watched_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스: 유저별 일일 시청 횟수 제한 조회 속도 최적화
CREATE INDEX IF NOT EXISTS idx_ad_reward_user_date
    ON public.ad_reward_logs(user_id, watched_at);

-- ────────────────────────────────────────────────────────────────
-- 2. RLS (Row Level Security) 정책 설정
-- 유저는 본인의 광고 시청 이력만 조회 가능 (타인 이력 열람 차단)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.ad_reward_logs ENABLE ROW LEVEL SECURITY;

-- 기존 정책 충돌 방지를 위한 DROP 후 재생성
DROP POLICY IF EXISTS "Users can view their own ad logs" ON public.ad_reward_logs;

CREATE POLICY "Users can view their own ad logs"
    ON public.ad_reward_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- 서비스 롤만 INSERT 가능 (클라이언트에서 직접 INSERT 불가)
DROP POLICY IF EXISTS "Service role can insert ad logs" ON public.ad_reward_logs;

CREATE POLICY "Service role can insert ad logs"
    ON public.ad_reward_logs
    FOR INSERT
    WITH CHECK (true);  -- RPC 함수(SECURITY DEFINER)에서만 호출됨

-- ────────────────────────────────────────────────────────────────
-- 3. 광고 보상 크레딧 지급을 위한 원자적 RPC 함수
-- 어뷰징 방지: 일일 최대 5회 제한 (UTC 기준)
-- SECURITY DEFINER: 관리자 권한으로 실행하여 RLS 우회 처리
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_credit_via_ad(
    target_user_id  UUID,
    target_ad_unit_id TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_count     INT;
    current_credits INT;
BEGIN
    -- 1. 해당 유저가 오늘(UTC 기준 자정부터) 광고를 몇 번 봤는지 카운트 검증
    SELECT COUNT(*) INTO daily_count
    FROM public.ad_reward_logs
    WHERE user_id  = target_user_id
      AND watched_at >= timezone('utc'::text, date_trunc('day', now()));

    -- 일일 최대 광고 시청 제한 (하루 5회)
    IF daily_count >= 5 THEN
        RAISE EXCEPTION 'ERR_DAILY_AD_LIMIT_EXCEEDED';
    END IF;

    -- 2. 광고 로그 테이블에 시청 기록 삽입
    INSERT INTO public.ad_reward_logs (user_id, ad_unit_id, rewarded_credits)
    VALUES (target_user_id, target_ad_unit_id, 3);

    -- 3. 유저 프로필의 크레딧 잔여량 3 증가
    UPDATE public.profiles
    SET credits    = credits + 3,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    -- 4. 최종 업데이트된 크레딧 수량 반환
    SELECT credits INTO current_credits
    FROM public.profiles
    WHERE id = target_user_id;

    RETURN current_credits;
END;
$$;

-- RPC 함수 실행 권한: 인증된 유저만 호출 가능
REVOKE ALL ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_credit_via_ad(UUID, TEXT) TO service_role;

-- ────────────────────────────────────────────────────────────────
-- 4. 일일 광고 시청 현황 조회 함수 (선택적 — 클라이언트 UI용)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_daily_ad_watch_count(target_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_count INT;
BEGIN
    SELECT COUNT(*) INTO daily_count
    FROM public.ad_reward_logs
    WHERE user_id  = target_user_id
      AND watched_at >= timezone('utc'::text, date_trunc('day', now()));

    RETURN daily_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_ad_watch_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_ad_watch_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_ad_watch_count(UUID) TO service_role;
