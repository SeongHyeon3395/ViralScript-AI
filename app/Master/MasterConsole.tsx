'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArchiveRestore, BarChart3, ChevronLeft, ChevronRight, CircleDollarSign,
  Edit3, Eye, EyeOff, FileClock, Film, Loader2, LockKeyhole, LogOut, RefreshCw,
  MessageSquare, Search, ShieldCheck, Trash2, UserRoundCog, Users, X,
} from 'lucide-react';
import { createMasterBrowserClient } from '@/lib/supabase/client';

type Tab = 'dashboard' | 'users' | 'trends' | 'inquiries' | 'audits';

interface DashboardData {
  stats: {
    users: number; suspendedUsers: number; activeTrends: number; deletedTrends: number;
    generations: number; todayGenerations: number; revenue: { krw: number; usd: number };
  };
  recentAudit: AuditRow[];
}

interface UserRow {
  id: string; email: string; full_name: string | null; phone_country_code: string | null; phone_number: string | null; subscription_plan: 'free' | 'pro' | 'agency';
  credits_remaining: number; theme_preference: 'dark' | 'light' | 'system'; default_language: 'ko' | 'en' | 'ja' | 'zh';
  email_notifications: boolean; default_target_platform: 'tiktok' | 'youtube'; is_suspended: boolean;
  suspended_at: string | null; suspension_reason: string | null; created_at: string; updated_at: string;
  referral_code: string; invited_count: number; referred_by_code: string | null;
  last_sign_in_at: string | null; email_confirmed_at: string | null; admin_role: string | null;
  auth_providers: string[];
}

interface TrendRow {
  id: string; platform: string; region: string; title: string; subtitle: string; views: string; likes: string;
  tags: string; thumb_url: string | null; video_url: string | null; created_at: string; deleted_at: string | null;
  delete_reason: string | null;
}

interface AuditRow {
  id: string; admin_user_id?: string; user_id?: string; actor_user_id?: string | null; actor?: { full_name?: string | null; email?: string } | null; target?: { full_name?: string | null; email?: string | null; title?: string | null } | null; action: string; target_type: string; target_id: string | null;
  before_data?: Record<string, unknown>; after_data?: Record<string, unknown>; reason: string | null; created_at: string;
}

interface PageData<T> { page: number; pageSize: number; total: number; users?: T[]; trends?: T[]; inquiries?: T[]; audits?: T[] }

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

function actionLabel(action: string): string {
  return ({
    'user.update': '사용자 수정', 'user.suspend': '계정 정지', 'user.restore': '계정 복원',
    'trend.update': '피드 수정', 'trend.delete': '피드 삭제', 'trend.restore': '피드 복원', 'trend.delete_bulk': '피드 일괄 삭제', 'trend.restore_bulk': '피드 일괄 복원', 'trend.purge': '피드 영구 삭제', 'trend.purge_bulk': '피드 일괄 영구 삭제', 'trend.refresh': '트렌드 피드 새로고침', 'profile.update': '사용자 프로필 수정', 'inquiry.status_update': '문의 상태 변경', 'inquiry.delete': '문의 삭제',
  } as Record<string, string>)[action] ?? action;
}

export default function MasterConsole() {
  const [masterClient] = useState(createMasterBrowserClient);
  const [status, setStatus] = useState<'checking' | 'login' | 'ready' | 'denied'>('checking');
  const [email, setEmail] = useState('psunghyi@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<PageData<UserRow>>({ page: 1, pageSize: 25, total: 0, users: [] });
  const [trends, setTrends] = useState<PageData<TrendRow>>({ page: 1, pageSize: 25, total: 0, trends: [] });
  const [audits, setAudits] = useState<PageData<AuditRow>>({ page: 1, pageSize: 25, total: 0, audits: [] });
  const [inquiries, setInquiries] = useState<PageData<InquiryRow>>({ page: 1, pageSize: 25, total: 0, inquiries: [] });
  const [search, setSearch] = useState('');
  const [trendStatus, setTrendStatus] = useState<'active' | 'deleted'>('active');
  const [selectedTrendIds, setSelectedTrendIds] = useState<string[]>([]);
  const [auditKind, setAuditKind] = useState<'admin' | 'user'>('admin');
  const [inquiryCategory, setInquiryCategory] = useState('all');
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editingTrend, setEditingTrend] = useState<TrendRow | null>(null);

  const api = useCallback(async (query = '', init?: RequestInit) => {
    const { data: { session } } = await masterClient.auth.getSession();
    if (!session) throw new Error('로그인이 필요합니다.');
    const response = await fetch(`/api/master${query}`, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...init?.headers },
    });
    const payload = await response.json() as { data?: unknown; admin?: { email?: string }; error?: string };
    if (!response.ok) {
      const nextError = new Error(payload.error ?? '요청에 실패했습니다.');
      Object.assign(nextError, { status: response.status });
      throw nextError;
    }
    if (payload.admin?.email) setAdminEmail(payload.admin.email);
    return payload.data;
  }, [masterClient]);

  const load = useCallback(async (nextTab: Tab, page = 1, query = search) => {
    setLoading(true); setError('');
    try {
      if (nextTab === 'dashboard') setDashboard(await api('?resource=dashboard') as DashboardData);
      if (nextTab === 'users') setUsers(await api(`?resource=users&page=${page}&search=${encodeURIComponent(query)}`) as PageData<UserRow>);
      if (nextTab === 'trends') setTrends(await api(`?resource=trends&page=${page}&status=${trendStatus}&search=${encodeURIComponent(query)}`) as PageData<TrendRow>);
      if (nextTab === 'audits') setAudits(await api(`?resource=audits&page=${page}&kind=${auditKind}`) as PageData<AuditRow>);
      if (nextTab === 'inquiries') setInquiries(await api(`?resource=inquiries&page=${page}&category=${encodeURIComponent(inquiryCategory)}&search=${encodeURIComponent(query)}`) as PageData<InquiryRow>);
      setStatus('ready');
    } catch (caught) {
      const err = caught as Error & { status?: number };
      setError(err.message);
      if (err.status === 401) setStatus('login');
      if (err.status === 403) setStatus('denied');
    } finally { setLoading(false); }
  }, [api, search, trendStatus, inquiryCategory, auditKind]);

  useEffect(() => {
    let cancelled = false;
    masterClient.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) setStatus('login');
      else {
        setLoading(true);
        api('?resource=dashboard')
          .then((result) => { if (!cancelled) { setDashboard(result as DashboardData); setStatus('ready'); } })
          .catch((caught) => {
            if (cancelled) return;
            const err = caught as Error & { status?: number };
            setError(err.message);
            setStatus(err.status === 403 ? 'denied' : 'login');
          })
          .finally(() => { if (!cancelled) setLoading(false); });
      }
    });
    return () => {
      cancelled = true;
      void masterClient.auth.signOut({ scope: 'local' });
    };
  }, [api, masterClient]);

  useEffect(() => {
    if (status !== 'ready' || tab === 'dashboard') return;
    const timer = window.setTimeout(() => void load(tab, 1, search), 300);
    return () => window.clearTimeout(timer);
  }, [search, trendStatus, inquiryCategory, auditKind, tab, status, load]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const { error: loginError } = await masterClient.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) { setError('아이디 또는 비밀번호가 올바르지 않습니다.'); setLoading(false); return; }
    setPassword('');
    await load('dashboard');
  }

  async function logout() {
    await masterClient.auth.signOut({ scope: 'local' });
    setStatus('login'); setAdminEmail(''); setPassword(''); setDashboard(null);
  }

  async function mutate(body: Record<string, unknown>, success: string) {
    setLoading(true); setError(''); setNotice('');
    try {
      await api('', { method: 'PATCH', body: JSON.stringify(body) });
      setNotice(success); setEditingUser(null); setEditingTrend(null); setSelectedTrendIds([]);
      await load(tab, tab === 'users' ? users.page : tab === 'trends' ? trends.page : 1);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '작업에 실패했습니다.'); }
    finally { setLoading(false); }
  }

  function switchTab(next: Tab) {
    setTab(next); setSearch(''); setNotice(''); setError(''); setSelectedTrendIds([]);
    if (next === 'dashboard') void load(next, 1, '');
  }

  if (status === 'checking') return <FullScreenLoader />;
  if (status === 'login' || status === 'denied') return (
    <main className="min-h-screen grid place-items-center px-4 py-12">
      <form onSubmit={login} className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/15 text-violet-300"><LockKeyhole size={26} /></div>
        <p className="mb-1 text-center text-xs font-bold uppercase tracking-[0.35em] text-violet-300">Restricted Area</p>
        <h1 className="text-center text-2xl font-black text-white">Master Console</h1>
        <p className="mt-2 text-center text-sm text-white/45">승인된 관리자 계정으로 로그인하세요.</p>
        {status === 'denied' && <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">현재 계정에는 관리자 권한이 없습니다. 계정을 전환하세요.</div>}
        {error && <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <label className="mt-6 block text-xs font-bold text-white/55">관리자 이메일</label>
        <input className="input-dark mt-2 w-full rounded-xl px-4 py-3 text-sm" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="mt-4 block text-xs font-bold text-white/55">비밀번호</label>
        <div className="relative mt-2">
          <input className="input-dark w-full rounded-xl px-4 py-3 pr-12 text-sm" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        <button disabled={loading} className="btn-primary mt-6 flex w-full items-center justify-center gap-2" type="submit">{loading && <Loader2 size={17} className="animate-spin" />}관리자 로그인</button>
        {status === 'denied' && <button type="button" onClick={logout} className="mt-3 w-full py-2 text-xs text-white/45 hover:text-white">현재 계정 로그아웃</button>}
      </form>
    </main>
  );

  const nav = [
    { id: 'dashboard' as const, label: '대시보드', icon: BarChart3 },
    { id: 'users' as const, label: '사용자 관리', icon: Users },
    { id: 'trends' as const, label: '트렌드 피드', icon: Film },
    { id: 'inquiries' as const, label: '문의 내용', icon: MessageSquare },
    { id: 'audits' as const, label: '감사 로그', icon: FileClock },
  ];

  return (
    <main className="min-h-screen bg-[#06070b] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col lg:flex-row">
        <aside className="border-b border-white/8 bg-[#0b0d14]/95 p-4 lg:w-64 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center justify-between lg:block">
            <div><p className="text-[10px] font-bold uppercase tracking-[.35em] text-violet-300">ViralScript AI</p><h1 className="mt-1 text-xl font-black">Master Console</h1></div>
            <ShieldCheck className="text-emerald-400 lg:mt-5" />
          </div>
          <nav className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => switchTab(id)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${tab === id ? 'bg-violet-600 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}><Icon size={16} />{label}</button>)}
          </nav>
          <div className="mt-5 border-t border-white/8 pt-4 lg:mt-auto lg:fixed lg:bottom-6 lg:w-[215px]">
            <p className="truncate text-xs text-white/45">{adminEmail}</p>
            <button onClick={logout} className="mt-2 flex items-center gap-2 text-xs text-red-300/70 hover:text-red-300"><LogOut size={14} />로그아웃</button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 sm:p-7 lg:p-10">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs text-white/35">운영 및 보안 관리</p><h2 className="mt-1 text-2xl font-black">{nav.find((item) => item.id === tab)?.label}</h2></div>
            <button type="button" aria-label="새로고침" onClick={() => void load(tab, tab === 'users' ? users.page : tab === 'trends' ? trends.page : tab === 'inquiries' ? inquiries.page : tab === 'audits' ? audits.page : 1)} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />새로고침</button>
          </header>
          {error && <Message color="red" text={error} onClose={() => setError('')} />}
          {notice && <Message color="emerald" text={notice} onClose={() => setNotice('')} />}
          {tab === 'dashboard' && dashboard && <Dashboard data={dashboard} />}
          {tab === 'users' && <UsersPanel data={users} search={search} setSearch={setSearch} edit={setEditingUser} page={(page) => void load('users', page)} />}
          {tab === 'trends' && <TrendsPanel data={trends} search={search} setSearch={setSearch} status={trendStatus} setStatus={(next) => { setTrendStatus(next); setSelectedTrendIds([]); }} selectedIds={selectedTrendIds} setSelectedIds={setSelectedTrendIds} edit={setEditingTrend} moderate={(row, restore) => { if (window.confirm(restore ? '이 피드를 복원하시겠습니까?' : '이 피드를 피드에서 숨기시겠습니까? 언제든 복원할 수 있습니다.')) void mutate({ action: restore ? 'restore_trend' : 'delete_trend', trendId: row.id }, restore ? '피드를 복원했습니다.' : '피드를 삭제 보관함으로 이동했습니다.'); }} bulk={(action, ids) => { const label = action === 'bulk_delete_trends' ? '선택한 피드를 삭제 보관함으로 이동하시겠습니까?' : action === 'bulk_restore_trends' ? '선택한 피드를 복원하시겠습니까?' : action === 'empty_trash' ? '삭제 보관함의 모든 피드를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.' : '선택한 피드를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'; if (window.confirm(label)) void mutate({ action, ...(ids ? { trendIds: ids } : {}) }, action === 'bulk_delete_trends' ? '선택한 피드를 삭제 보관함으로 이동했습니다.' : action === 'bulk_restore_trends' ? '선택한 피드를 복원했습니다.' : '삭제 보관함을 비웠습니다.'); }} page={(page) => void load('trends', page)} />}
          {tab === 'audits' && <AuditsPanel data={audits} kind={auditKind} setKind={setAuditKind} page={(page) => void load('audits', page)} />}
          {tab === 'inquiries' && <InquiriesPanel data={inquiries} search={search} setSearch={setSearch} category={inquiryCategory} setCategory={setInquiryCategory} update={(row, nextStatus) => { const adminNote = window.prompt('관리 메모를 입력하세요. 민감정보는 입력하지 마세요.', row.admin_note ?? ''); if (adminNote === null) return; void mutate({ action: 'update_inquiry', inquiryId: row.id, status: nextStatus, adminNote }, '문의 상태를 저장했습니다.'); }} remove={(row) => { if (!window.confirm(`${row.sender_email}의 문의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return; const reason = window.prompt('삭제 사유를 입력하세요. 감사 로그에 저장됩니다.', ''); if (reason === null) return; void mutate({ action: 'delete_inquiry', inquiryId: row.id, reason }, '문의가 삭제되었습니다.'); }} page={(page) => void load('inquiries', page)} />}
          {loading && <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-black/15"><Loader2 className="animate-spin text-violet-300" size={30} /></div>}
        </section>
      </div>
      {editingUser && <UserEditor user={editingUser} close={() => setEditingUser(null)} save={(body) => void mutate({ action: 'update_user', userId: editingUser.id, ...body }, '사용자 정보를 저장했습니다.')} />}
      {editingTrend && <TrendEditor trend={editingTrend} close={() => setEditingTrend(null)} save={(body) => void mutate({ action: 'update_trend', trendId: editingTrend.id, ...body }, '피드 정보를 저장했습니다.')} />}
    </main>
  );
}

function FullScreenLoader() { return <main className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-violet-300" size={32} /></main>; }

function Message({ color, text, onClose }: { color: 'red' | 'emerald'; text: string; onClose: () => void }) { return <div className={`mb-5 flex items-center justify-between rounded-xl border p-3 text-sm ${color === 'red' ? 'border-red-500/25 bg-red-500/10 text-red-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'}`}><span>{text}</span><button onClick={onClose}><X size={15} /></button></div>; }

function Dashboard({ data }: { data: DashboardData }) {
  const cards = [
    ['전체 사용자', data.stats.users.toLocaleString(), Users], ['정지 사용자', data.stats.suspendedUsers.toLocaleString(), UserRoundCog],
    ['활성 피드', data.stats.activeTrends.toLocaleString(), Film], ['누적 생성', data.stats.generations.toLocaleString(), Activity],
    ['오늘 생성', data.stats.todayGenerations.toLocaleString(), BarChart3], ['누적 매출', `₩${data.stats.revenue.krw.toLocaleString()}`, CircleDollarSign],
  ] as const;
  return <div className="space-y-7"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-white/8 bg-white/[.025] p-5"><Icon size={18} className="mb-5 text-violet-300" /><p className="text-xs text-white/40">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="rounded-2xl border border-white/8 bg-white/[.025] p-5"><h3 className="font-bold">최근 관리자 작업</h3><div className="mt-4 divide-y divide-white/6">{data.recentAudit.length ? data.recentAudit.map((row) => <div key={row.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{actionLabel(row.action)} <span className="text-white/35">· {row.target_type}</span></span><span className="text-xs text-white/35">{formatDate(row.created_at)}</span></div>) : <Empty />}</div></div></div>;
}

function SearchBar({ value, setValue }: { value: string; setValue: (value: string) => void }) { return <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input value={value} onChange={(e) => setValue(e.target.value)} className="input-dark w-full rounded-xl py-2.5 pl-9 pr-3 text-sm sm:w-80" placeholder="이름 또는 이메일 검색" /></div>; }

function authProviderLabel(providers: string[]): string {
  const names = providers.map((provider) => provider === 'email' ? 'Email' : provider === 'google' ? 'Google' : provider);
  return names.length ? names.join(' + ') : '-';
}

function UsersPanel({ data, search, setSearch, edit, page }: { data: PageData<UserRow>; search: string; setSearch: (v: string) => void; edit: (v: UserRow) => void; page: (v: number) => void }) {
  return <div><div className="mb-4 flex items-center justify-between gap-3"><SearchBar value={search} setValue={setSearch} /><span className="text-xs text-white/35">총 {data.total.toLocaleString()}명</span></div><div className="overflow-x-auto rounded-2xl border border-white/8"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-white/[.035] text-xs text-white/40"><tr><th className="p-4">사용자</th><th>로그인 방식</th><th>플랜</th><th>크레딧</th><th>추천인</th><th>상태</th><th>최근 로그인</th><th>가입일</th><th className="pr-4 text-right">관리</th></tr></thead><tbody className="divide-y divide-white/6">{data.users?.map((user) => <tr key={user.id} className="hover:bg-white/[.02]"><td className="p-4"><p className="font-bold">{user.full_name || '이름 없음'} {user.admin_role && <span className="ml-1 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">{user.admin_role}</span>}</p><p className="mt-1 text-xs text-white/35">{user.email}</p><p className="mt-1 text-xs text-white/35">{user.phone_number ? `${user.phone_country_code ?? ''} ${user.phone_number}` : '-'}</p></td><td className="text-xs text-cyan-200">{authProviderLabel(user.auth_providers ?? [])}</td><td className="uppercase text-white/65">{user.subscription_plan}</td><td>{user.credits_remaining.toLocaleString()}</td><td><p className="font-mono text-xs text-violet-200">{user.referral_code}</p><p className="mt-1 text-[11px] text-white/35">초대 {user.invited_count}명{user.referred_by_code ? ` · 사용 ${user.referred_by_code}` : ''}</p></td><td><span className={`rounded-full px-2 py-1 text-xs ${user.is_suspended ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{user.is_suspended ? '정지' : '정상'}</span></td><td className="text-xs text-white/45">{formatDate(user.last_sign_in_at)}</td><td className="text-xs text-white/45">{formatDate(user.created_at)}</td><td className="pr-4 text-right"><button type="button" aria-label={`${user.email} 관리`} onClick={() => edit(user)} className="rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/5 hover:text-white"><Edit3 size={14} /></button></td></tr>)}</tbody></table>{!data.users?.length && <Empty />}</div><Pagination page={data.page} total={data.total} size={data.pageSize} go={page} /></div>;
}

function TrendsPanel({ data, search, setSearch, status, setStatus, selectedIds, setSelectedIds, edit, moderate, bulk, page }: { data: PageData<TrendRow>; search: string; setSearch: (v: string) => void; status: 'active' | 'deleted'; setStatus: (v: 'active' | 'deleted') => void; selectedIds: string[]; setSelectedIds: (ids: string[]) => void; edit: (v: TrendRow) => void; moderate: (v: TrendRow, restore: boolean) => void; bulk: (action: 'bulk_delete_trends' | 'bulk_restore_trends' | 'purge_trends' | 'empty_trash', ids?: string[]) => void; page: (v: number) => void }) {
  const ids = data.trends?.map((trend) => trend.id) ?? []; const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
  const toggle = (id: string) => setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><button type="button" aria-pressed={status === 'active'} onClick={() => setStatus('active')} className={`rounded-xl px-3 py-2 text-xs font-bold ${status === 'active' ? 'bg-violet-600' : 'bg-white/5 text-white/45'}`}>활성 피드</button><button type="button" aria-pressed={status === 'deleted'} onClick={() => setStatus('deleted')} className={`rounded-xl px-3 py-2 text-xs font-bold ${status === 'deleted' ? 'bg-violet-600' : 'bg-white/5 text-white/45'}`}>삭제 보관함</button></div><SearchBar value={search} setValue={setSearch} /></div><div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[.025] p-3"><label className="flex items-center gap-2 text-xs text-white/65"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : ids)} />전체 선택</label><span className="text-xs text-white/35">{selectedIds.length}개 선택</span>{status === 'active' ? <button type="button" disabled={!selectedIds.length} onClick={() => bulk('bulk_delete_trends', selectedIds)} className="ml-auto rounded-lg border border-red-500/25 px-3 py-2 text-xs text-red-200 disabled:opacity-35">선택 삭제</button> : <><button type="button" disabled={!selectedIds.length} onClick={() => bulk('bulk_restore_trends', selectedIds)} className="ml-auto rounded-lg border border-emerald-500/25 px-3 py-2 text-xs text-emerald-200 disabled:opacity-35">선택 복원</button><button type="button" disabled={!selectedIds.length} onClick={() => bulk('purge_trends', selectedIds)} className="rounded-lg border border-red-500/25 px-3 py-2 text-xs text-red-200 disabled:opacity-35">선택 영구 삭제</button><button type="button" onClick={() => bulk('empty_trash')} className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-100">휴지통 비우기</button></>}</div><div className="grid gap-3 xl:grid-cols-2">{data.trends?.map((trend) => <article key={trend.id} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[.025] p-4"><label className="flex shrink-0 items-start pt-1"><input type="checkbox" aria-label={`${trend.title} 선택`} checked={selectedIds.includes(trend.id)} onChange={() => toggle(trend.id)} /></label>{trend.thumb_url ? <div role="img" aria-label={trend.title} className="h-24 w-36 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(trend.thumb_url)})` }} /> : <div className="h-24 w-36 shrink-0 rounded-xl bg-white/5" />}<div className="min-w-0 flex-1"><div className="flex gap-2 text-[10px] font-bold uppercase text-violet-300"><span>{trend.platform}</span><span>·</span><span>{trend.region}</span></div><h3 className="mt-2 line-clamp-2 text-sm font-bold">{trend.title}</h3><p className="mt-2 text-xs text-white/35">조회 {trend.views} · 좋아요 {trend.likes}</p>{trend.delete_reason && <p className="mt-1 truncate text-xs text-red-300/60">{trend.delete_reason}</p>}</div><div className="flex flex-col gap-2">{status === 'active' && <button type="button" onClick={() => edit(trend)} aria-label={`${trend.title} 수정`} className="rounded-lg border border-white/10 p-2 text-white/50 hover:text-white"><Edit3 size={14} /></button>}<button type="button" onClick={() => moderate(trend, status === 'deleted')} aria-label={`${trend.title} ${status === 'deleted' ? '복원' : '삭제'}`} className={`rounded-lg border p-2 ${status === 'deleted' ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/20 text-red-300'}`}>{status === 'deleted' ? <ArchiveRestore size={14} /> : <Trash2 size={14} />}</button></div></article>)}</div>{!data.trends?.length && <div className="rounded-2xl border border-white/8"><Empty /></div>}<Pagination page={data.page} total={data.total} size={data.pageSize} go={page} /></div>;
}

function changedFields(row: AuditRow): string {
  if (row.reason) return row.reason;
  const before = row.before_data ?? {};
  const after = row.after_data ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return keys.length ? keys.map((key) => `${key}: ${String(before[key] ?? '—')} → ${String(after[key] ?? '—')}`).join(' · ') : '변경 상세 없음';
}

function AuditsPanel({ data, kind, setKind, page }: { data: PageData<AuditRow>; kind: 'admin' | 'user'; setKind: (kind: 'admin' | 'user') => void; page: (v: number) => void }) {
  return <div><div className="mb-4 flex flex-wrap items-center gap-2"><button type="button" aria-pressed={kind === 'admin'} onClick={() => setKind('admin')} className={`rounded-xl px-3 py-2 text-xs font-bold ${kind === 'admin' ? 'bg-violet-600' : 'bg-white/5 text-white/45'}`}>관리자 로그</button><button type="button" aria-pressed={kind === 'user'} onClick={() => setKind('user')} className={`rounded-xl px-3 py-2 text-xs font-bold ${kind === 'user' ? 'bg-violet-600' : 'bg-white/5 text-white/45'}`}>사용자 로그</button><p className="ml-1 text-xs text-white/40">{kind === 'admin' ? '관리자 또는 시스템이 수행한 운영 작업입니다.' : '사용자가 자신의 프로필과 설정을 변경한 기록입니다.'}</p></div><div className="overflow-x-auto rounded-2xl border border-white/8"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-white/[.035] text-xs text-white/40"><tr><th className="p-4">작업</th><th>대상</th><th>변경 내용</th><th>{kind === 'user' ? '사용자' : '관리자'}</th><th className="pr-4">일시</th></tr></thead><tbody className="divide-y divide-white/6">{data.audits?.map((row) => <tr key={row.id} className="align-top"><td className="p-4 font-bold">{actionLabel(row.action)}<p className="mt-1 text-[10px] font-normal text-white/35">{row.target_type}</p></td><td className="py-4 text-xs text-white/55"><p className="font-semibold text-white/75">{row.target?.full_name || row.target?.title || '대상 정보 없음'}</p><p className="mt-1">{row.target?.email || row.target_id || '-'}</p></td><td className="max-w-sm py-4 text-xs text-white/55"><p className="break-words">{changedFields(row)}</p><details className="mt-2 text-[11px] text-cyan-200"><summary className="cursor-pointer">변경 전후 상세 보기</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/20 p-2 text-[10px] text-white/55">{JSON.stringify({ before: row.before_data, after: row.after_data }, null, 2)}</pre></details></td><td className="py-4 text-xs text-white/55"><p className="font-semibold text-white/75">{row.actor?.full_name || (kind === 'admin' && !row.actor_user_id ? '시스템' : '이름 없음')}</p><p className="mt-1">{row.actor?.email || row.actor_user_id || '-'}</p></td><td className="pr-4 py-4 text-xs text-white/40">{formatDate(row.created_at)}</td></tr>)}</tbody></table>{!data.audits?.length && <Empty />}</div><Pagination page={data.page} total={data.total} size={data.pageSize} go={page} /></div>;
}

const inquiryCategoryLabels: Record<InquiryRow['category'], string> = {
  account: '계정 및 로그인', billing: '결제 및 크레딧', generation: '영상 제작', bug: '오류 신고', feature: '기능 제안', other: '기타', suspension_appeal: '정지 이의 신청',
};

function InquiriesPanel({ data, search, setSearch, category, setCategory, update, remove, page }: { data: PageData<InquiryRow>; search: string; setSearch: (v: string) => void; category: string; setCategory: (v: string) => void; update: (row: InquiryRow, status: InquiryRow['status']) => void; remove: (row: InquiryRow) => void; page: (v: number) => void }) {
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><label className="text-xs text-white/45" htmlFor="inquiry-category">카테고리</label><select id="inquiry-category" value={category} onChange={(event) => setCategory(event.target.value)} className="input-dark rounded-xl px-3 py-2 text-xs"><option value="all">전체</option>{Object.entries(inquiryCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <SearchBar value={search} setValue={setSearch} />
    </div>
    <p className="mb-3 text-xs text-white/35">총 {data.total.toLocaleString()}건</p>
    <div className="space-y-3">{data.inquiries?.map((inquiry) => <article key={inquiry.id} className="rounded-2xl border border-white/8 bg-white/[.025] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200">{inquiryCategoryLabels[inquiry.category]}</span><h3 className="mt-3 font-bold">{inquiry.sender_name || '이름 없음'}</h3><a href={`mailto:${inquiry.sender_email}`} className="mt-1 inline-block text-sm text-violet-300 hover:text-violet-200">{inquiry.sender_email}</a><p className="mt-1 text-xs text-white/35">접수: {formatDate(inquiry.created_at)}</p></div><div className="flex items-center gap-2"><label className="text-xs text-white/40" htmlFor={`inquiry-status-${inquiry.id}`}>처리 상태</label><select id={`inquiry-status-${inquiry.id}`} value={inquiry.status} onChange={(event) => update(inquiry, event.target.value as InquiryRow['status'])} className="input-dark rounded-lg px-2 py-1.5 text-xs"><option value="new">새 문의</option><option value="in_progress">처리 중</option><option value="resolved">처리 완료</option></select><button type="button" onClick={() => remove(inquiry)} aria-label={`${inquiry.sender_email} 문의 삭제`} className="rounded-lg border border-red-500/25 p-2 text-red-200 hover:bg-red-500/10"><Trash2 size={14} /></button></div></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{inquiry.message}</p>{inquiry.admin_note && <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-white/45">관리 메모: {inquiry.admin_note}</p>}</article>)}</div>
    {!data.inquiries?.length && <div className="rounded-2xl border border-white/8"><Empty /></div>}
    <Pagination page={data.page} total={data.total} size={data.pageSize} go={page} />
  </div>;
}

function Pagination({ page, total, size, go }: { page: number; total: number; size: number; go: (v: number) => void }) { const pages = Math.max(1, Math.ceil(total / size)); return <div className="mt-5 flex items-center justify-center gap-3 text-xs text-white/45"><button disabled={page <= 1} onClick={() => go(page - 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-25"><ChevronLeft size={14} /></button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => go(page + 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-25"><ChevronRight size={14} /></button></div>; }
function Empty() { return <div className="p-10 text-center text-sm text-white/30">표시할 데이터가 없습니다.</div>; }

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><div className="my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#10121b] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black">{title}</h2><button onClick={close} className="text-white/45 hover:text-white"><X size={20} /></button></div>{children}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-white/45">{label}</span>{children}</label>; }
const inputClass = 'input-dark w-full rounded-xl px-3 py-2.5 text-sm';

function UserEditor({ user, close, save }: { user: UserRow; close: () => void; save: (v: Record<string, unknown>) => void }) {
  const [fullName, setFullName] = useState(user.full_name ?? ''); const [plan, setPlan] = useState(user.subscription_plan); const [credits, setCredits] = useState(String(user.credits_remaining)); const [language, setLanguage] = useState(user.default_language); const [notifications, setNotifications] = useState(user.email_notifications); const [suspended, setSuspended] = useState(user.is_suspended); const [reason, setReason] = useState(user.suspension_reason ?? '');
  return <Modal title="사용자 관리" close={close}><p className="mb-5 rounded-xl bg-white/5 p-3 text-sm text-white/55">{user.email}</p><div className="grid gap-4 sm:grid-cols-2"><Field label="이름"><input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field><Field label="구독 플랜"><select className={inputClass} value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)}><option value="free">Free</option><option value="pro">Pro</option><option value="agency">Agency</option></select></Field><Field label="크레딧"><input className={inputClass} type="number" min="0" max="1000000" value={credits} onChange={(e) => setCredits(e.target.value)} /></Field><Field label="기본 언어"><select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}><option value="ko">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option></select></Field><Field label="이메일 알림"><select className={inputClass} value={String(notifications)} onChange={(e) => setNotifications(e.target.value === 'true')}><option value="true">수신</option><option value="false">수신 안 함</option></select></Field></div><div className="mt-5 rounded-xl border border-red-500/15 bg-red-500/5 p-4"><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={suspended} disabled={Boolean(user.admin_role)} onChange={(e) => setSuspended(e.target.checked)} />계정 로그인 정지</label><textarea className={`${inputClass} mt-3 min-h-20`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="변경 사유" /></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={close} className="rounded-xl px-4 py-2 text-sm text-white/50">취소</button><button type="button" onClick={() => save({ fullName, subscriptionPlan: plan, creditsRemaining: Number(credits), defaultLanguage: language, emailNotifications: notifications, suspended, reason })} className="btn-primary-compact px-5 py-2.5 text-sm">저장</button></div></Modal>;
}

function TrendEditor({ trend, close, save }: { trend: TrendRow; close: () => void; save: (v: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState(trend.title); const [subtitle, setSubtitle] = useState(trend.subtitle ?? ''); const [views, setViews] = useState(trend.views); const [likes, setLikes] = useState(trend.likes); const [tags, setTags] = useState(trend.tags ?? ''); const [reason, setReason] = useState('');
  return <Modal title="트렌드 피드 수정" close={close}><div className="space-y-4"><Field label="제목"><textarea className={`${inputClass} min-h-20`} value={title} onChange={(e) => setTitle(e.target.value)} /></Field><Field label="설명"><textarea className={`${inputClass} min-h-20`} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="조회수"><input className={inputClass} value={views} onChange={(e) => setViews(e.target.value)} /></Field><Field label="좋아요"><input className={inputClass} value={likes} onChange={(e) => setLikes(e.target.value)} /></Field></div><Field label="태그"><input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} /></Field><Field label="수정 사유"><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div><div className="mt-6 flex justify-end gap-2"><button onClick={close} className="rounded-xl px-4 py-2 text-sm text-white/50">취소</button><button onClick={() => save({ title, subtitle, views, likes, tags, reason })} className="btn-primary-compact px-5 py-2.5 text-sm">저장</button></div></Modal>;
}

interface InquiryRow {
  id: string; user_id: string; sender_email: string; sender_name: string | null;
  category: 'account' | 'billing' | 'generation' | 'bug' | 'feature' | 'other' | 'suspension_appeal'; message: string; created_at: string;
  status: 'new' | 'in_progress' | 'resolved'; admin_note: string | null; handled_by: string | null; handled_at: string | null; updated_at: string;
}
