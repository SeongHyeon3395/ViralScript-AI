import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

export interface MasterSession {
  user: User;
  role: 'master' | 'admin';
  supabase: ReturnType<typeof createAdminClient>;
}

export class MasterAuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
  }
}

export async function requireMaster(req: NextRequest): Promise<MasterSession> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new MasterAuthError(401, '로그인이 필요합니다.');
  }

  const supabase = createAdminClient();
  const token = authorization.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new MasterAuthError(401, '세션이 만료되었습니다.');

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminError) throw new Error(`관리자 권한 조회 실패: ${adminError.message}`);
  if (!admin?.is_active || !['master', 'admin'].includes(admin.role)) {
    throw new MasterAuthError(403, '관리자 권한이 없습니다.');
  }

  return { user: data.user, role: admin.role as 'master' | 'admin', supabase };
}

export function safeProfileSnapshot(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) return null;
  const allowed = [
    'id', 'email', 'full_name', 'subscription_plan', 'credits_remaining', 'theme_preference',
    'default_language', 'email_notifications', 'default_target_platform', 'is_suspended',
    'suspended_at', 'suspension_reason', 'created_at', 'updated_at',
  ];
  return Object.fromEntries(allowed.filter((key) => key in value).map((key) => [key, value[key]]));
}

export async function writeMasterAudit(
  session: MasterSession,
  input: {
    action: string;
    targetType: string;
    targetId?: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string;
  },
): Promise<void> {
  const { error } = await session.supabase.from('admin_audit_logs').insert({
    admin_user_id: session.user.id,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    before_data: input.before ?? null,
    after_data: input.after ?? null,
    reason: input.reason?.trim() || null,
  });
  if (error) throw new Error(`감사 로그 저장 실패: ${error.message}`);
}