-- Keep the historical trend archive, while making daily inserts and thumbnail reads fast.
ALTER TABLE public.trend_feed
  ADD COLUMN IF NOT EXISTS thumb_url TEXT;

CREATE INDEX IF NOT EXISTS idx_trend_feed_created_at
  ON public.trend_feed(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_feed_video_url
  ON public.trend_feed(video_url);

CREATE INDEX IF NOT EXISTS idx_trend_feed_thumbnail
  ON public.trend_feed(thumb_url)
  WHERE thumb_url IS NOT NULL;
