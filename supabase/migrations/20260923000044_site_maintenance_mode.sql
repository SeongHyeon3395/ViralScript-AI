CREATE TABLE IF NOT EXISTS public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  maintenance_mode text CHECK (maintenance_mode IS NULL OR maintenance_mode IN ('update', 'incident', 'bugfix')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.site_settings (id, maintenance_mode)
VALUES (true, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
CREATE POLICY site_settings_public_status_read
  ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.master_set_site_maintenance(
  p_actor_id uuid,
  p_mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_previous text;
  v_updated_at timestamptz;
BEGIN
  IF p_mode IS NOT NULL AND p_mode NOT IN ('update', 'incident', 'bugfix') THEN
    RAISE EXCEPTION 'Invalid maintenance mode';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_actor_id AND role = 'master' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Active master role required';
  END IF;

  INSERT INTO public.site_settings (id, maintenance_mode)
  VALUES (true, NULL)
  ON CONFLICT (id) DO NOTHING;

  SELECT maintenance_mode INTO v_previous
  FROM public.site_settings WHERE id = true FOR UPDATE;

  UPDATE public.site_settings
  SET maintenance_mode = p_mode, updated_at = now(), updated_by = p_actor_id
  WHERE id = true
  RETURNING updated_at INTO v_updated_at;

  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, target_type, target_id, before_data, after_data, reason
  ) VALUES (
    p_actor_id,
    CASE WHEN p_mode IS NULL THEN 'site.maintenance.disabled' ELSE 'site.maintenance.enabled' END,
    'site',
    'global',
    jsonb_build_object('maintenance_mode', v_previous),
    jsonb_build_object('maintenance_mode', p_mode),
    CASE WHEN p_mode IS NULL THEN 'Master password re-authenticated; global maintenance disabled'
         ELSE 'Master password re-authenticated; global maintenance enabled' END
  );

  RETURN jsonb_build_object(
    'previous_mode', v_previous,
    'maintenance_mode', p_mode,
    'updated_at', v_updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.master_set_site_maintenance(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.master_set_site_maintenance(uuid, text) TO service_role;
