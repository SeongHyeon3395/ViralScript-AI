import { NextRequest, NextResponse } from 'next/server';
import { MasterAuthError, requireMaster, safeProfileSnapshot, writeMasterAudit } from '@/lib/masterAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 25;
const PROFILE_FIELDS = 'id, email, full_name, subscription_plan, credits_remaining, theme_preference, default_language, email_notifications, default_target_platform, is_suspended, suspended_at, suspension_reason, created_at, updated_at';
const TREND_FIELDS = 'id, platform, region, title, subtitle, views, likes, tags, thumb_url, video_url, url, created_at, deleted_at, deleted_by, delete_reason';

function apiError(error: unknown): NextResponse {
  if (error instanceof MasterAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[master]', error);
  return NextResponse.json({ error: '관리자 요청 처리에 실패했습니다.' }, { status: 500 });
}

function pageFrom(req: NextRequest): number {
  return Math.max(1, Math.min(10_000, Number.parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1));
}

function cleanSearch(value: string | null): string {
  return (value ?? '').trim().replace(/[%_,()]/g, '').slice(0, 100);
}

async function getDashboard(session: Awaited<ReturnType<typeof requireMaster>>) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [users, suspended, trends, deletedTrends, generations, todayGenerations, transactions, recentAudit] = await Promise.all([
    session.supabase.from('profiles').select('*', { count: 'exact', head: true }),
    session.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
    session.supabase.from('trend_feed').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    session.supabase.from('trend_feed').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null),
    session.supabase.from('user_generation_history').select('*', { count: 'exact', head: true }),
    session.supabase.from('user_generation_history').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay.toISOString()),
    session.supabase.from('billing_transactions').select('amount_krw, amount_usd, status').eq('status', 'success').limit(10_000),
    session.supabase.from('admin_audit_logs').select('id, action, target_type, target_id, reason, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const failures = [users, suspended, trends, deletedTrends, generations, todayGenerations, transactions, recentAudit].filter((result) => result.error);
  if (failures.length) throw new Error(failures[0].error?.message ?? '대시보드 조회 실패');

  const revenue = (transactions.data ?? []).reduce((sum, row) => ({
    krw: sum.krw + Number(row.amount_krw ?? 0),
    usd: sum.usd + Number(row.amount_usd ?? 0),
  }), { krw: 0, usd: 0 });

  return {
    stats: {
      users: users.count ?? 0,
      suspendedUsers: suspended.count ?? 0,
      activeTrends: trends.count ?? 0,
      deletedTrends: deletedTrends.count ?? 0,
      generations: generations.count ?? 0,
      todayGenerations: todayGenerations.count ?? 0,
      revenue,
    },
    recentAudit: recentAudit.data ?? [],
  };
}

async function getUsers(req: NextRequest, session: Awaited<ReturnType<typeof requireMaster>>) {
  const page = pageFrom(req);
  const search = cleanSearch(req.nextUrl.searchParams.get('search'));
  let query = session.supabase
    .from('profiles')
    .select(PROFILE_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((profile) => profile.id);
  const { data: adminRows, error: adminsError } = ids.length
    ? await session.supabase.from('admin_users').select('user_id, role, is_active').in('user_id', ids)
    : { data: [], error: null };
  if (adminsError) throw new Error(adminsError.message);
  const adminById = new Map((adminRows ?? []).map((admin) => [admin.user_id, admin]));

  const users = await Promise.all((data ?? []).map(async (profile) => {
    const authResult = await session.supabase.auth.admin.getUserById(profile.id);
    if (authResult.error) throw new Error(authResult.error.message);
    const admin = adminById.get(profile.id);
    return {
      ...profile,
      last_sign_in_at: authResult.data.user?.last_sign_in_at ?? null,
      email_confirmed_at: authResult.data.user?.email_confirmed_at ?? null,
      admin_role: admin?.is_active ? admin.role : null,
    };
  }));
  return { users, page, pageSize: PAGE_SIZE, total: count ?? 0 };
}

async function getTrends(req: NextRequest, session: Awaited<ReturnType<typeof requireMaster>>) {
  const page = pageFrom(req);
  const search = cleanSearch(req.nextUrl.searchParams.get('search'));
  const status = req.nextUrl.searchParams.get('status') === 'deleted' ? 'deleted' : 'active';
  let query = session.supabase
    .from('trend_feed')
    .select(TREND_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  query = status === 'deleted' ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  if (search) query = query.or(`title.ilike.%${search}%,subtitle.ilike.%${search}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { trends: data ?? [], status, page, pageSize: PAGE_SIZE, total: count ?? 0 };
}

async function getAudits(req: NextRequest, session: Awaited<ReturnType<typeof requireMaster>>) {
  const page = pageFrom(req);
  const { data, error, count } = await session.supabase
    .from('admin_audit_logs')
    .select('id, admin_user_id, action, target_type, target_id, reason, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { audits: data ?? [], page, pageSize: PAGE_SIZE, total: count ?? 0 };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireMaster(req);
    const resource = req.nextUrl.searchParams.get('resource') ?? 'dashboard';
    const data = resource === 'users'
      ? await getUsers(req, session)
      : resource === 'trends'
        ? await getTrends(req, session)
        : resource === 'audits'
          ? await getAudits(req, session)
          : await getDashboard(session);
    return NextResponse.json({ data, admin: { email: session.user.email, role: session.role } });
  } catch (error) {
    return apiError(error);
  }
}

interface UserUpdateBody {
  action: 'update_user';
  userId: string;
  fullName?: string | null;
  subscriptionPlan?: 'free' | 'pro' | 'agency';
  creditsRemaining?: number;
  themePreference?: 'dark' | 'light' | 'system';
  defaultLanguage?: 'ko' | 'en' | 'ja' | 'zh';
  emailNotifications?: boolean;
  defaultTargetPlatform?: 'tiktok' | 'youtube';
  suspended?: boolean;
  reason?: string;
}

interface TrendUpdateBody {
  action: 'update_trend';
  trendId: string;
  title?: string;
  subtitle?: string;
  views?: string;
  likes?: string;
  tags?: string;
  reason?: string;
}

interface TrendModerationBody {
  action: 'delete_trend' | 'restore_trend';
  trendId: string;
  reason?: string;
}

type MasterMutation = UserUpdateBody | TrendUpdateBody | TrendModerationBody;

async function updateUser(session: Awaited<ReturnType<typeof requireMaster>>, body: UserUpdateBody) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.userId ?? '')) throw new Error('사용자 ID가 올바르지 않습니다.');
  const { data: targetAdmin } = await session.supabase.from('admin_users').select('role, is_active').eq('user_id', body.userId).maybeSingle();
  if (targetAdmin?.is_active && body.userId !== session.user.id) throw new Error('다른 관리자 계정은 수정할 수 없습니다.');
  if (body.suspended === true && body.userId === session.user.id) throw new Error('현재 관리자 계정은 정지할 수 없습니다.');

  const { data: before, error: beforeError } = await session.supabase.from('profiles').select(PROFILE_FIELDS).eq('id', body.userId).single();
  if (beforeError || !before) throw new Error('사용자를 찾을 수 없습니다.');

  const updates: Record<string, unknown> = {};
  if ('fullName' in body) updates.full_name = body.fullName?.trim().slice(0, 100) || null;
  if (body.subscriptionPlan && ['free', 'pro', 'agency'].includes(body.subscriptionPlan)) updates.subscription_plan = body.subscriptionPlan;
  if (body.creditsRemaining !== undefined) {
    if (!Number.isInteger(body.creditsRemaining) || body.creditsRemaining < 0 || body.creditsRemaining > 1_000_000) throw new Error('크레딧 값이 올바르지 않습니다.');
    updates.credits_remaining = body.creditsRemaining;
  }
  if (body.themePreference && ['dark', 'light', 'system'].includes(body.themePreference)) updates.theme_preference = body.themePreference;
  if (body.defaultLanguage && ['ko', 'en', 'ja', 'zh'].includes(body.defaultLanguage)) updates.default_language = body.defaultLanguage;
  if (typeof body.emailNotifications === 'boolean') updates.email_notifications = body.emailNotifications;
  if (body.defaultTargetPlatform && ['tiktok', 'youtube'].includes(body.defaultTargetPlatform)) updates.default_target_platform = body.defaultTargetPlatform;
  const suspensionChanged = typeof body.suspended === 'boolean' && body.suspended !== before.is_suspended;
  let authChanged = false;
  if (suspensionChanged) {
    updates.is_suspended = body.suspended;
    updates.suspended_at = body.suspended ? new Date().toISOString() : null;
    updates.suspension_reason = body.suspended ? body.reason?.trim().slice(0, 500) || '관리자에 의한 계정 정지' : null;
    const { error: authError } = await session.supabase.auth.admin.updateUserById(body.userId, {
      ban_duration: body.suspended ? '876000h' : 'none',
    });
    if (authError) throw new Error(`인증 계정 상태 변경 실패: ${authError.message}`);
    authChanged = true;
  }
  if (!Object.keys(updates).length) throw new Error('변경할 값이 없습니다.');

  const { data: after, error } = await session.supabase.from('profiles').update(updates).eq('id', body.userId).select(PROFILE_FIELDS).single();
  if (error || !after) {
    if (authChanged) {
      const { error: rollbackError } = await session.supabase.auth.admin.updateUserById(body.userId, {
        ban_duration: before.is_suspended ? '876000h' : 'none',
      });
      if (rollbackError) console.error('[master] auth rollback failed', { userId: body.userId, error: rollbackError.message });
    }
    throw new Error(error?.message ?? '사용자 수정 실패');
  }
  try {
    await writeMasterAudit(session, {
    action: suspensionChanged && body.suspended === true ? 'user.suspend' : suspensionChanged && body.suspended === false ? 'user.restore' : 'user.update',
    targetType: 'user', targetId: body.userId,
    before: safeProfileSnapshot(before), after: safeProfileSnapshot(after), reason: body.reason,
  });
  } catch (auditError) {
    console.error('[master] user audit write failed', auditError);
  }
  return after;
}

async function updateTrend(session: Awaited<ReturnType<typeof requireMaster>>, body: TrendUpdateBody) {
  const { data: before, error: beforeError } = await session.supabase.from('trend_feed').select(TREND_FIELDS).eq('id', body.trendId).single();
  if (beforeError || !before) throw new Error('피드를 찾을 수 없습니다.');
  const updates: Record<string, string> = {};
  for (const [bodyKey, dbKey, max] of [['title', 'title', 300], ['subtitle', 'subtitle', 500], ['views', 'views', 50], ['likes', 'likes', 50], ['tags', 'tags', 500]] as const) {
    const value = body[bodyKey];
    if (value !== undefined) updates[dbKey] = value.trim().slice(0, max);
  }
  if (!updates.title && body.title !== undefined) throw new Error('제목은 비워둘 수 없습니다.');
  if (!Object.keys(updates).length) throw new Error('변경할 값이 없습니다.');
  const { data: after, error } = await session.supabase.from('trend_feed').update(updates).eq('id', body.trendId).select(TREND_FIELDS).single();
  if (error || !after) throw new Error(error?.message ?? '피드 수정 실패');
  await writeMasterAudit(session, { action: 'trend.update', targetType: 'trend', targetId: body.trendId, before, after, reason: body.reason });
  return after;
}

async function moderateTrend(session: Awaited<ReturnType<typeof requireMaster>>, body: TrendModerationBody) {
  const { data: before, error: beforeError } = await session.supabase.from('trend_feed').select(TREND_FIELDS).eq('id', body.trendId).single();
  if (beforeError || !before) throw new Error('피드를 찾을 수 없습니다.');
  const deleting = body.action === 'delete_trend';
  const updates = deleting
    ? { deleted_at: new Date().toISOString(), deleted_by: session.user.id, delete_reason: body.reason?.trim().slice(0, 500) || '관리자 삭제' }
    : { deleted_at: null, deleted_by: null, delete_reason: null };
  const { data: after, error } = await session.supabase.from('trend_feed').update(updates).eq('id', body.trendId).select(TREND_FIELDS).single();
  if (error || !after) throw new Error(error?.message ?? '피드 상태 변경 실패');
  await writeMasterAudit(session, { action: deleting ? 'trend.delete' : 'trend.restore', targetType: 'trend', targetId: body.trendId, before, after, reason: body.reason });
  return after;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireMaster(req);
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > 16_384) return NextResponse.json({ error: '요청이 너무 큽니다.' }, { status: 413 });
    const body = await req.json() as MasterMutation;
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
    }
    const data = body.action === 'update_user'
      ? await updateUser(session, body)
      : body.action === 'update_trend'
        ? await updateTrend(session, body)
        : body.action === 'delete_trend' || body.action === 'restore_trend'
          ? await moderateTrend(session, body)
          : null;
    if (!data) return NextResponse.json({ error: '지원하지 않는 작업입니다.' }, { status: 400 });
    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}