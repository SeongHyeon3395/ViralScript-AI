-- Migration 006: grant the configured administrator account its master credits.
-- The Auth user must be created separately through an approved Supabase admin workflow.
-- Administrator credentials must never be stored in migrations or source control.

INSERT INTO public.profiles (id, email, credits_remaining, created_at, updated_at)
SELECT id, email, 9999, now(), now()
FROM auth.users
WHERE email = 'psunghyi@gmail.com'
ON CONFLICT (id) DO UPDATE SET credits_remaining = 9999;
