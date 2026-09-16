-- PostgREST's ON CONFLICT requires a table constraint or non-partial unique
-- index. The prior partial index caused every daily cron upsert to fail.
-- Abort rather than deleting or merging data if an unexpected duplicate exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.trend_feed
    WHERE video_url IS NOT NULL
    GROUP BY platform, video_url
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add trend_feed platform/video_url uniqueness: duplicate data exists';
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.trend_feed_platform_video_url_unique;

ALTER TABLE public.trend_feed
  ADD CONSTRAINT trend_feed_platform_video_url_unique UNIQUE (platform, video_url);
