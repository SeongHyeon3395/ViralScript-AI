-- ============================================================
-- Migration 008: trend_feed 테이블에 url 컬럼 추가
-- ============================================================

ALTER TABLE public.trend_feed
  ADD COLUMN IF NOT EXISTS url TEXT;
