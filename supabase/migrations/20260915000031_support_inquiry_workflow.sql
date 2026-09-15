-- Track inquiry handling without pretending an email was sent. Status changes and
-- their audit record are committed atomically by a protected server-only RPC.
ALTER TABLE public.support_inquiries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'resolved')),
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS support_inquiries_status_created_at_idx
  ON public.support_inquiries(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.master_update_inquiry_with_audit(
  p_actor_id UUID,
  p_inquiry_id UUID,
  p_status TEXT,
  p_admin_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role TEXT;
  v_before public.support_inquiries%ROWTYPE;
  v_after public.support_inquiries%ROWTYPE;
BEGIN
  SELECT role INTO v_actor_role
  FROM public.admin_users
  WHERE user_id = p_actor_id AND is_active = true
  FOR SHARE;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('master', 'admin') THEN
    RAISE EXCEPTION 'ADMIN_ROLE_REQUIRED';
  END IF;
  IF p_status NOT IN ('new', 'in_progress', 'resolved') THEN
    RAISE EXCEPTION 'INVALID_INQUIRY_STATUS';
  END IF;

  SELECT * INTO v_before
  FROM public.support_inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INQUIRY_NOT_FOUND'; END IF;

  UPDATE public.support_inquiries
  SET status = p_status,
      admin_note = NULLIF(LEFT(BTRIM(COALESCE(p_admin_note, '')), 2000), ''),
      handled_by = p_actor_id,
      handled_at = CASE WHEN p_status = 'resolved' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_inquiry_id
  RETURNING * INTO v_after;

  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, target_type, target_id, before_data, after_data, reason
  ) VALUES (
    p_actor_id,
    'inquiry.status_update',
    'support_inquiry',
    p_inquiry_id::TEXT,
    jsonb_build_object('status', v_before.status, 'handled_at', v_before.handled_at),
    jsonb_build_object('status', v_after.status, 'handled_at', v_after.handled_at),
    NULLIF(LEFT(BTRIM(COALESCE(p_admin_note, '')), 500), '')
  );

  RETURN jsonb_build_object(
    'id', v_after.id,
    'status', v_after.status,
    'admin_note', v_after.admin_note,
    'handled_by', v_after.handled_by,
    'handled_at', v_after.handled_at,
    'updated_at', v_after.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.master_update_inquiry_with_audit(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.master_update_inquiry_with_audit(UUID, UUID, TEXT, TEXT) TO service_role;
