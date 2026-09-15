-- A suspended person cannot authenticate, so their appeal is accepted only when
-- it matches an already-suspended profile. Ordinary support requests still require auth.
ALTER TABLE public.support_inquiries
  DROP CONSTRAINT IF EXISTS support_inquiries_category_check;
ALTER TABLE public.support_inquiries
  ADD CONSTRAINT support_inquiries_category_check
  CHECK (category IN ('account', 'billing', 'generation', 'bug', 'feature', 'other', 'suspension_appeal'));
