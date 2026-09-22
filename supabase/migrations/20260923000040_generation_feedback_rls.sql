-- Feedback includes a user's comments and generation relationship. It is written
-- only through the authenticated server route using the service role, so browser
-- clients must not be able to query or mutate this public-schema table directly.
ALTER TABLE public.generation_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.generation_feedback FROM PUBLIC, anon, authenticated;
