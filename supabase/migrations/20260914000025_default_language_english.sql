-- Set English as the default language for all users.
ALTER TABLE public.profiles
  ALTER COLUMN default_language SET DEFAULT 'en';

UPDATE public.profiles
SET default_language = 'en'
WHERE default_language IS NULL OR default_language = 'ko';
