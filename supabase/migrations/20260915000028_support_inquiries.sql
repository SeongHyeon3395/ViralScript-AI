-- Authenticated support inquiries. Sender identity is derived in the server route,
-- and only active Master Console users can read the data through the service role.
CREATE TABLE IF NOT EXISTS public.support_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sender_email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('account', 'billing', 'generation', 'bug', 'feature', 'other')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_inquiries_created_at_idx ON public.support_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS support_inquiries_category_created_at_idx ON public.support_inquiries (category, created_at DESC);
CREATE INDEX IF NOT EXISTS support_inquiries_user_created_at_idx ON public.support_inquiries (user_id, created_at DESC);

ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_inquiries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.support_inquiries TO service_role;
