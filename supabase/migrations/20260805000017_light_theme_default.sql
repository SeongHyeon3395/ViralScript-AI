-- Use the light theme as the default while preserving explicit user choices.
ALTER TABLE public.profiles
  ALTER COLUMN theme_preference SET DEFAULT 'light';

UPDATE public.profiles
SET theme_preference = 'light'
WHERE theme_preference IS NULL;