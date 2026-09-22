-- Cover the remaining foreign keys reported by the performance advisor.
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_user_id_idx
  ON public.admin_audit_logs (admin_user_id);

CREATE INDEX IF NOT EXISTS generation_feedback_generation_id_idx
  ON public.generation_feedback (generation_id);
