-- ================================================================
-- Migration 005: Trend Feed 실시간 테이블
-- 2026-07-14 — Vercel Cron + Gemini AI 자동 큐레이션
-- ================================================================

CREATE TABLE IF NOT EXISTS public.trend_feed (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform   TEXT NOT NULL CHECK (platform IN ('TikTok', 'YouTube Shorts', 'Instagram Reels')),
    region     TEXT NOT NULL CHECK (region IN ('US', 'KR', 'JP')),
    title      TEXT NOT NULL,
    subtitle   TEXT,
    views      TEXT,
    likes      TEXT,
    tags       TEXT,
    thumb_url  TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trend_feed_platform ON public.trend_feed(platform);
CREATE INDEX IF NOT EXISTS idx_trend_feed_region ON public.trend_feed(region);

ALTER TABLE public.trend_feed ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능
DROP POLICY IF EXISTS "Anyone can view trend feed" ON public.trend_feed;
CREATE POLICY "Anyone can view trend feed" ON public.trend_feed FOR SELECT USING (true);

-- Insert/Delete 는 Service Role 전용
DROP POLICY IF EXISTS "Service role can manage trend feed" ON public.trend_feed;
CREATE POLICY "Service role can manage trend feed" ON public.trend_feed FOR ALL TO service_role USING (true);
