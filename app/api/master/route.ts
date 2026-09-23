import { NextRequest, NextResponse } from 'next/server';
import { MasterAuthError, requireMaster, writeMasterAudit } from '@/lib/masterAuth';
import { createServerClient } from '@/lib/supabase/server';
import { SITE_MAINTENANCE_MODES, type SiteMaintenanceMode } from '@/lib/siteMaintenance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAGE_SIZE = 25;
const PROFILE_FIELDS = 'id, email, full_name, phone_country_code, phone_number, subscription_plan, credits_remaining, theme_preference, default_language, email_notifications, default_target_platform, is_suspended, suspended_at, suspension_reason, referral_code, created_at, updated_at';
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
  const [adminsResult, referrerEventsResult, referredEventsResult] = ids.length
    ? await Promise.all([
      session.supabase.from('admin_users').select('user_id, role, is_active').in('user_id', ids),
      session.supabase.from('referral_events').select('referrer_user_id').in('referrer_user_id', ids),
      session.supabase.from('referral_events').select('referred_user_id, referral_code').in('referred_user_id', ids),
    ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }] as const;
  if (adminsResult.error || referrerEventsResult.error || referredEventsResult.error) {
    throw new Error(adminsResult.error?.message ?? referrerEventsResult.error?.message ?? referredEventsResult.error?.message ?? '추천인 정보 조회 실패');
  }
  const adminRows = adminsResult.data;
  const adminById = new Map((adminRows ?? []).map((admin) => [admin.user_id, admin]));
  const invitedCountById = new Map<string, number>();
  for (const event of referrerEventsResult.data ?? []) {
    invitedCountById.set(event.referrer_user_id, (invitedCountById.get(event.referrer_user_id) ?? 0) + 1);
  }
  const referredByCodeById = new Map((referredEventsResult.data ?? []).map((event) => [event.referred_user_id, event.referral_code]));

  const users = await Promise.all((data ?? []).map(async (profile) => {
    const authResult = await session.supabase.auth.admin.getUserById(profile.id);
    if (authResult.error) throw new Error(authResult.error.message);
    const admin = adminById.get(profile.id);
    return {
      ...profile,
      last_sign_in_at: authResult.data.user?.last_sign_in_at ?? null,
      email_confirmed_at: authResult.data.user?.email_confirmed_at ?? null,
      auth_providers: [...new Set((authResult.data.user?.identities ?? []).map((identity) => identity.provider))],
      admin_role: admin?.is_active ? admin.role : null,
      invited_count: invitedCountById.get(profile.id) ?? 0,
      referred_by_code: referredByCodeById.get(profile.id) ?? null,
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
  const kind = req.nextUrl.searchParams.get('kind') === 'user' ? 'user' : 'admin';
  const table = kind === 'user' ? 'user_activity_logs' : 'admin_audit_logs';
  const fields = kind === 'user'
    ? 'id, user_id, action, target_type, target_id, before_data, after_data, created_at'
    : 'id, admin_user_id, action, target_type, target_id, before_data, after_data, reason, created_at';
  const { data, error, count } = await session.supabase
    .from(table)
    .select(fields, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const auditRows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const actorIds = [...new Set(auditRows.map((row) => kind === 'user' ? row.user_id : row.admin_user_id).filter((id): id is string => typeof id === 'string'))];
  const { data: profiles, error: profileError } = actorIds.length
    ? await session.supabase.from('profiles').select('id, full_name, email').in('id', actorIds)
    : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);
  const actorById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const profileTargetIds = [...new Set(auditRows
    .filter((row) => ['profile', 'user'].includes(String(row.target_type)) && typeof row.target_id === 'string')
    .map((row) => String(row.target_id)))];
  const inquiryTargetIds = [...new Set(auditRows
    .filter((row) => row.target_type === 'support_inquiry' && typeof row.target_id === 'string')
    .map((row) => String(row.target_id)))];
  const [targetProfiles, targetInquiries] = await Promise.all([
    profileTargetIds.length ? session.supabase.from('profiles').select('id, full_name, email').in('id', profileTargetIds) : Promise.resolve({ data: [], error: null }),
    inquiryTargetIds.length ? session.supabase.from('support_inquiries').select('id, sender_email').in('id', inquiryTargetIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (targetProfiles.error || targetInquiries.error) throw new Error(targetProfiles.error?.message ?? targetInquiries.error?.message ?? '감사 로그 대상 조회 실패');
  const targetProfileById = new Map((targetProfiles.data ?? []).map((profile) => [profile.id, profile]));
  const targetInquiryById = new Map((targetInquiries.data ?? []).map((inquiry) => [inquiry.id, inquiry]));
  return {
    audits: auditRows.map((row) => {
      const actorId = kind === 'user' ? row.user_id : row.admin_user_id;
      const targetId = typeof row.target_id === 'string' ? row.target_id : null;
      const profileTarget = targetId ? targetProfileById.get(targetId) : null;
      const inquiryTarget = targetId ? targetInquiryById.get(targetId) : null;
      const deletedInquiryEmail = typeof row.before_data === 'object' && row.before_data && typeof (row.before_data as Record<string, unknown>).sender_email === 'string'
        ? (row.before_data as Record<string, string>).sender_email
        : null;
      return {
        ...row,
        actor_user_id: actorId ?? null,
        actor: actorId ? actorById.get(actorId) ?? null : null,
        target: profileTarget ?? (inquiryTarget ? { email: inquiryTarget.sender_email } : deletedInquiryEmail ? { email: deletedInquiryEmail } : null),
      };
    }),
    kind, page, pageSize: PAGE_SIZE, total: count ?? 0,
  };
}

async function getInquiries(req: NextRequest, session: Awaited<ReturnType<typeof requireMaster>>) {
  const page = pageFrom(req);
  const search = cleanSearch(req.nextUrl.searchParams.get('search'));
  const category = req.nextUrl.searchParams.get('category') ?? 'all';
  const validCategories = ['account', 'billing', 'generation', 'bug', 'feature', 'other', 'suspension_appeal'];
  let query = session.supabase
    .from('support_inquiries')
    .select('id, user_id, sender_email, category, message, status, admin_note, handled_by, handled_at, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (validCategories.includes(category)) query = query.eq('category', category);
  if (search) query = query.or(`sender_email.ilike.%${search}%,message.ilike.%${search}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const ids = [...new Set((data ?? []).map((item) => item.user_id))];
  const { data: profiles, error: profileError } = ids.length
    ? await session.supabase.from('profiles').select('id, full_name').in('id', ids)
    : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);
  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  return { inquiries: (data ?? []).map((item) => ({ ...item, sender_name: nameById.get(item.user_id) ?? null })), page, pageSize: PAGE_SIZE, total: count ?? 0 };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireMaster(req);
    const resource = req.nextUrl.searchParams.get('resource') ?? 'dashboard';
    if (resource === 'site-settings') {
      if (session.role !== 'master') throw new MasterAuthError(403, '이 설정은 마스터 계정만 변경할 수 있습니다.');
      const { data, error } = await session.supabase
        .from('site_settings')
        .select('maintenance_mode, updated_at, updated_by')
        .eq('id', true)
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ data, admin: { email: session.user.email, role: session.role } });
    }
    const data = resource === 'users'
      ? await getUsers(req, session)
      : resource === 'trends'
        ? await getTrends(req, session)
        : resource === 'audits'
          ? await getAudits(req, session)
          : resource === 'inquiries'
            ? await getInquiries(req, session)
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
interface TrendBulkBody {
  action: 'bulk_delete_trends' | 'bulk_restore_trends' | 'purge_trends' | 'empty_trash';
  trendIds?: string[];
  reason?: string;
}

interface InquiryUpdateBody {
  action: 'update_inquiry';
  inquiryId: string;
  status: 'new' | 'in_progress' | 'resolved';
  adminNote?: string;
}
interface InquiryDeleteBody {
  action: 'delete_inquiry';
  inquiryId: string;
  reason?: string;
}

interface SiteMaintenanceBody {
  action: 'site_maintenance';
  mode: SiteMaintenanceMode | null;
  password: string;
}

type MasterMutation = UserUpdateBody | TrendUpdateBody | TrendModerationBody | TrendBulkBody | InquiryUpdateBody | InquiryDeleteBody | SiteMaintenanceBody;

async function setSiteMaintenance(session: Awaited<ReturnType<typeof requireMaster>>, body: SiteMaintenanceBody) {
  if (session.role !== 'master') throw new MasterAuthError(403, '이 설정은 마스터 계정만 변경할 수 있습니다.');
  if (body.mode !== null && !SITE_MAINTENANCE_MODES.includes(body.mode)) throw new Error('점검 상태가 올바르지 않습니다.');
  if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 256) {
    throw new MasterAuthError(401, '계속하려면 관리자 비밀번호를 입력해 주세요.');
  }
  if (!session.user.email) throw new MasterAuthError(403, '마스터 계정 이메일을 확인할 수 없습니다.');

  const authClient = createServerClient();
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: session.user.email,
    password: body.password,
  });
  if (authError || authData.user?.id !== session.user.id) {
    throw new MasterAuthError(401, '관리자 비밀번호가 올바르지 않습니다.');
  }

  const { data, error } = await session.supabase.rpc('master_set_site_maintenance', {
    p_actor_id: session.user.id,
    p_mode: body.mode,
  });
  if (error || !data) throw new Error(error?.message ?? '사이트 설정 저장에 실패했습니다.');
  return data;
}

async function updateUser(session: Awaited<ReturnType<typeof requireMaster>>, body: UserUpdateBody) {
  if (session.role !== 'master') throw new MasterAuthError(403, 'Only a master may change user accounts.');
  if (body.userId === session.user.id && (body.subscriptionPlan !== undefined || body.creditsRemaining !== undefined || body.suspended !== undefined)) {
    throw new Error('You cannot change your own sensitive account fields.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.userId ?? '')) throw new Error('사용자 ID가 올바르지 않습니다.');
  const { data: targetAdmin } = await session.supabase.from('admin_users').select('role, is_active').eq('user_id', body.userId).maybeSingle();
  // Master may edit administrator profiles; normalize this local result so the legacy guard below
  // cannot mistake an authorized master action for an administrator-on-administrator change.
  if (session.role === 'master' && targetAdmin?.is_active) targetAdmin.is_active = false;
  // The actor role comes from admin_users in requireMaster, never from request data.
  if (targetAdmin?.is_active && body.userId !== session.user.id) throw new Error('다른 관리자 계정은 수정할 수 없습니다.');
  if (body.suspended === true && body.userId === session.user.id) throw new Error('현재 관리자 계정은 정지할 수 없습니다.');

  const { data: before, error: beforeError } = await session.supabase.from('profiles').select(PROFILE_FIELDS).eq('id', body.userId).single();
  if (beforeError || !before) throw new Error('사용자를 찾을 수 없습니다.');

  const suspensionRequested = typeof body.suspended === 'boolean';
  if (suspensionRequested) {
    const { error: authUpdateError } = await session.supabase.auth.admin.updateUserById(body.userId, {
      // Auth bans stop new sign-ins and revoke refresh-token continuation. The app also
      // checks profiles.is_suspended to remove any already-open browser session.
      ban_duration: body.suspended ? '876000h' : 'none',
    });
    if (authUpdateError) throw new Error(`Unable to update the authentication suspension: ${authUpdateError.message}`);
  }

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
  if (typeof body.suspended === 'boolean') updates.is_suspended = body.suspended;
  if (!Object.keys(updates).length) throw new Error('No permitted fields to update.');
  const { data: atomicResult, error: atomicError } = await session.supabase.rpc('master_update_user_with_audit', {
    p_actor_id: session.user.id,
    p_target_id: body.userId,
    p_patch: updates,
    p_reason: body.reason?.trim().slice(0, 500) || null,
  });
  if (atomicError || !atomicResult) {
    if (suspensionRequested) {
      await session.supabase.auth.admin.updateUserById(body.userId, { ban_duration: before.is_suspended ? '876000h' : 'none' });
    }
    throw new Error(atomicError?.message ?? 'User update and audit transaction failed.');
  }
  return atomicResult;

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
  return manageTrends(session, { action: body.action === 'delete_trend' ? 'bulk_delete_trends' : 'bulk_restore_trends', trendIds: [body.trendId], reason: body.reason });
}

async function manageTrends(session: Awaited<ReturnType<typeof requireMaster>>, body: TrendBulkBody) {
  const isEmptyTrash = body.action === 'empty_trash';
  const dbAction = body.action === 'bulk_delete_trends' ? 'delete' : body.action === 'bulk_restore_trends' ? 'restore' : 'purge';
  const ids = isEmptyTrash ? null : body.trendIds;
  if (!isEmptyTrash && (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)))) {
    throw new Error('트렌드 선택이 올바르지 않습니다.');
  }
  const { data, error } = await session.supabase.rpc('master_manage_trends_with_audit', {
    p_actor_id: session.user.id,
    p_action: dbAction,
    p_trend_ids: ids,
    p_reason: body.reason?.trim().slice(0, 500) || null,
  });
  if (error || !data) throw new Error(error?.message ?? '트렌드 일괄 작업에 실패했습니다.');
  return data;
}

async function updateInquiry(session: Awaited<ReturnType<typeof requireMaster>>, body: InquiryUpdateBody) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.inquiryId ?? '')) throw new Error('문의 ID가 올바르지 않습니다.');
  if (!['new', 'in_progress', 'resolved'].includes(body.status)) throw new Error('문의 상태가 올바르지 않습니다.');
  if (body.adminNote !== undefined && (typeof body.adminNote !== 'string' || body.adminNote.length > 2000)) throw new Error('관리 메모가 너무 깁니다.');
  const { data, error } = await session.supabase.rpc('master_update_inquiry_with_audit', {
    p_actor_id: session.user.id,
    p_inquiry_id: body.inquiryId,
    p_status: body.status,
    p_admin_note: body.adminNote?.trim() || null,
  });
  if (error || !data) throw new Error(error?.message ?? '문의 상태 변경에 실패했습니다.');
  return data;
}

async function deleteInquiry(session: Awaited<ReturnType<typeof requireMaster>>, body: InquiryDeleteBody) {
  if (session.role !== 'master') throw new MasterAuthError(403, 'Only a master may delete inquiries.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.inquiryId ?? '')) throw new Error('문의 ID가 올바르지 않습니다.');
  if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 500)) throw new Error('삭제 사유가 너무 깁니다.');
  const { data, error } = await session.supabase.rpc('master_delete_inquiry_with_audit', {
    p_actor_id: session.user.id,
    p_inquiry_id: body.inquiryId,
    p_reason: body.reason?.trim() || null,
  });
  if (error || !data) throw new Error(error?.message ?? '문의 삭제에 실패했습니다.');
  return data;
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
      : body.action === 'site_maintenance'
        ? await setSiteMaintenance(session, body)
      : body.action === 'update_trend'
        ? await updateTrend(session, body)
          : body.action === 'update_inquiry'
            ? await updateInquiry(session, body)
            : body.action === 'delete_inquiry'
              ? await deleteInquiry(session, body)
            : body.action === 'delete_trend' || body.action === 'restore_trend'
              ? await moderateTrend(session, body)
              : body.action === 'bulk_delete_trends' || body.action === 'bulk_restore_trends' || body.action === 'purge_trends' || body.action === 'empty_trash'
                ? await manageTrends(session, body)
            : null;
    if (!data) return NextResponse.json({ error: '지원하지 않는 작업입니다.' }, { status: 400 });
    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}
