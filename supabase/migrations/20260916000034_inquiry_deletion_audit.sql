-- Inquiry deletion is restricted to an active master and is auditable. The
-- inquiry row and its audit record succeed or fail as one transaction.
CREATE OR REPLACE FUNCTION public.master_delete_inquiry_with_audit(
  p_actor_id UUID,
  p_inquiry_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before public.support_inquiries%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_actor_id AND role = 'master' AND is_active
  ) THEN
    RAISE EXCEPTION 'MASTER_REQUIRED';
  END IF;

  SELECT * INTO v_before
  FROM public.support_inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INQUIRY_NOT_FOUND'; END IF;

  DELETE FROM public.support_inquiries WHERE id = p_inquiry_id;

  -- Keep only operational metadata in the audit record; inquiry contents may
  -- include personal information and must not be copied into a permanent log.
  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, target_type, target_id, before_data, after_data, reason
  ) VALUES (
    p_actor_id,
    'inquiry.delete',
    'support_inquiry',
    p_inquiry_id,
    jsonb_build_object(
      'sender_email', v_before.sender_email,
      'category', v_before.category,
      'status', v_before.status,
      'created_at', v_before.created_at
    ),
    jsonb_build_object('deleted', true),
    NULLIF(LEFT(BTRIM(COALESCE(p_reason, '')), 500), '')
  );

  RETURN jsonb_build_object('id', p_inquiry_id, 'deleted', true);
END;
$$;

REVOKE ALL ON FUNCTION public.master_delete_inquiry_with_audit(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.master_delete_inquiry_with_audit(UUID, UUID, TEXT) TO service_role;
