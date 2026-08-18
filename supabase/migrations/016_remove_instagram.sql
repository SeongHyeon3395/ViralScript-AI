-- Remove Instagram from the active trend and profile platform choices.
DELETE FROM public.trend_feed
WHERE lower(platform) IN ('instagram', 'instagram reels');

ALTER TABLE public.trend_feed
  DROP CONSTRAINT IF EXISTS trend_feed_platform_check;
ALTER TABLE public.trend_feed
  ADD CONSTRAINT trend_feed_platform_check
  CHECK (platform IN ('TikTok', 'YouTube Shorts'));

UPDATE public.profiles
SET default_target_platform = 'tiktok'
WHERE lower(default_target_platform) = 'instagram';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_default_target_platform_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_target_platform_check
  CHECK (default_target_platform IN ('tiktok', 'youtube'));
