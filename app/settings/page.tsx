'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Globe, CreditCard, AlertTriangle,
  Save, Loader2, CheckCircle2, LogIn, ArrowRight,
  Bell, Monitor, Smartphone, Lock,
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/app/components/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from '@/app/components/LanguageSwitcher';

// ─── 타입 ─────────────────────────────────────────────────────────

interface UserSettings {
  full_name: string | null;
  email: string;
  default_language: 'ko' | 'en' | 'ja' | 'zh';
  email_notifications: boolean;
  default_target_platform: 'tiktok' | 'youtube';
}

type TabId = 'profile' | 'platform' | 'billing' | 'danger';

const TABS: { id: TabId; icon: React.ElementType; label: string }[] = [
  { id: 'profile',   icon: User,          label: '내 프로필' },
  { id: 'platform',  icon: Globe,         label: '플랫폼 설정' },
  { id: 'billing',   icon: CreditCard,    label: '결제 및 구독' },
  { id: 'danger',    icon: AlertTriangle, label: '위험 구역' },
];

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(13,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2.5 border-b border-white/6 pb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center">
          <Icon size={15} className="text-violet-400" />
        </div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-white/50 mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-xl px-4 py-2.5 text-sm input-dark disabled:opacity-40 disabled:cursor-not-allowed"
    />
  );
}

function SelectInput<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="w-full rounded-xl px-4 py-2.5 text-sm input-dark appearance-none cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white/80">{label}</p>
        {hint && <p className="text-xs text-white/30 mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-violet-600' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ─── 탭별 패널 ─────────────────────────────────────────────────────

function ProfileTab({ settings, onUpdate }: { settings: UserSettings; onUpdate: (p: Partial<UserSettings>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="기본 정보" icon={User}>
        <div className="space-y-4">
          <div>
            <FieldLabel>이름</FieldLabel>
            <TextInput value={settings.full_name ?? ''} onChange={v => onUpdate({ full_name: v })} placeholder="홍길동" />
          </div>
          <div>
            <FieldLabel>이메일 (변경 불가)</FieldLabel>
            <TextInput value={settings.email} disabled />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="알림 설정" icon={Bell}>
        <Toggle
          checked={settings.email_notifications}
          onChange={v => onUpdate({ email_notifications: v })}
          label="이메일 알림"
          hint="크레딧 충전, 분석 완료 등 중요 이벤트를 이메일로 수신합니다"
        />
      </SectionCard>
    </div>
  );
}

function PlatformTab({ settings, onUpdate }: { settings: UserSettings; onUpdate: (p: Partial<UserSettings>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="기본 분석 플랫폼" icon={Smartphone}>
        <div>
          <FieldLabel>기본 타겟 플랫폼</FieldLabel>
          <SelectInput
            value={settings.default_target_platform}
            onChange={v => onUpdate({ default_target_platform: v })}
            options={[
              { value: 'tiktok',    label: '🎵 TikTok' },
              { value: 'youtube',   label: '▶️ YouTube Shorts' },
            ]}
          />
          <p className="text-xs text-white/30 mt-2">분석 결과 생성 시 기본으로 선택될 플랫폼입니다</p>
        </div>
      </SectionCard>

      <SectionCard title="표시 설정" icon={Monitor}>
        <div className="space-y-4">
          <div>
            <FieldLabel>기본 언어</FieldLabel>
            <SelectInput
              value={settings.default_language}
              onChange={v => onUpdate({ default_language: v })}
              options={[
                { value: 'ko', label: '🇰🇷 한국어' },
                { value: 'en', label: '🇺🇸 English' },
                { value: 'ja', label: '🇯🇵 日本語' },
                { value: 'zh', label: '🇨🇳 中文' },
              ]}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function BillingTab() {
  return (
    <SectionCard title="결제 및 구독 관리" icon={CreditCard}>
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
          <Lock size={22} className="text-white/30" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/50">Phase 3에서 오픈 예정</p>
          <p className="text-xs text-white/25 mt-1 max-w-xs">구독 플랜 변경, 결제 내역, 인보이스 발행 기능이 곧 추가됩니다</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
          🔒 준비 중
        </span>
      </div>
    </SectionCard>
  );
}

function DangerTab({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const [confirmed, setConfirmed] = useState('');
  const canDelete = confirmed === '탈퇴합니다';

  return (
    <SectionCard title="위험 구역" icon={AlertTriangle}>
      <div className="space-y-5">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm font-semibold text-red-400 mb-1">회원 탈퇴</p>
          <p className="text-xs text-white/40 leading-relaxed">
            탈퇴 시 모든 크레딧, 생성 기록, 설정이 즉시 삭제되며 복구할 수 없습니다.
            아래에 <span className="text-white/70 font-mono">탈퇴합니다</span>를 입력해 확인하세요.
          </p>
        </div>
        <div>
          <FieldLabel>확인 문구 입력</FieldLabel>
          <TextInput
            value={confirmed}
            onChange={setConfirmed}
            placeholder="탈퇴합니다"
          />
        </div>
        <button
          onClick={onDeleteAccount}
          disabled={!canDelete}
          className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          영구 삭제 및 탈퇴
        </button>
      </div>
    </SectionCard>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('full_name, email, default_language, email_notifications, default_target_platform')
      .eq('id', user.id)
      .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

    if (error || !data) {
      setFetchLoading(false);
      return;
    }
    setSettings({
      full_name:               (data.full_name as string | null) ?? null,
      email:                   (data.email as string | null) ?? user.email ?? '',
      default_language:        (data.default_language as UserSettings['default_language']) ?? 'ko',
      email_notifications:     (data.email_notifications as boolean | null) ?? true,
      default_target_platform: (data.default_target_platform as UserSettings['default_target_platform']) ?? 'tiktok',
    });
    setFetchLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) void loadSettings();
    if (!authLoading && !user) setFetchLoading(false);
  }, [authLoading, user, loadSettings]);

  function handleUpdate(patch: Partial<UserSettings>) {
    setSettings(prev => prev ? { ...prev, ...patch } : prev);
  }

  async function handleSave() {
    if (!settings || !user) return;
    setSaving(true); setSaveOk(false); setSaveError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('update_user_settings', {
        p_default_language:        settings.default_language,
        p_email_notifications:     settings.email_notifications,
        p_default_target_platform: settings.default_target_platform,
      });
      if (error) throw error;

      // full_name은 직접 UPDATE (RPC에 포함하지 않음)
      if (settings.full_name !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: nameErr } = await (supabase as any)
          .from('profiles')
          .update({ full_name: settings.full_name, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (nameErr) throw nameErr;
      }


      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    // 실제 탈퇴 처리는 서버 액션 또는 admin API 필요 — 여기서는 로그아웃 후 홈으로
    router.push('/');
  }

  // ─── 렌더 ───────────────────────────────────────────────────────

  if (authLoading || fetchLoading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 pt-28 pb-20 px-4">
          <div className="mx-auto max-w-3xl animate-pulse space-y-4">
            <div className="h-8 w-40 rounded-lg bg-white/10" />
            <div className="h-64 rounded-2xl bg-white/5 border border-white/8" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="flex-1 pt-32 pb-20 px-4">
          <div className="mx-auto max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto">
              <LogIn size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">로그인이 필요합니다</h2>
            <p className="text-sm text-white/40">계정 설정을 변경하려면 먼저 로그인하세요</p>
            <a href="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              <LogIn size={16} /> 로그인하기 <ArrowRight size={15} />
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20 sm:pt-24 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* 헤더 */}
          <div className="space-y-1 px-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">계정 설정</h1>
            <p className="text-xs sm:text-sm text-white/40">프로필, 플랫폼 기본값, 알림 등을 관리합니다</p>
          </div>

          <div className="flex gap-5 flex-col sm:flex-row">
            {/* 탭 사이드바 */}
            <nav className="flex sm:flex-col gap-1 sm:w-44 shrink-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
              {TABS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                    ${activeTab === id
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                    } ${id === 'danger' ? (activeTab === id ? '' : 'hover:text-red-400 hover:bg-red-500/5') : ''}`}
                >
                  <Icon size={15} className={id === 'danger' ? (activeTab === id ? 'text-red-400' : '') : ''} />
                  {label}
                </button>
              ))}
            </nav>

            {/* 콘텐츠 */}
            <div className="flex-1 min-w-0 space-y-4">
              {settings && activeTab === 'profile'  && <ProfileTab  settings={settings} onUpdate={handleUpdate} />}
              {settings && activeTab === 'platform' && <PlatformTab settings={settings} onUpdate={handleUpdate} />}
              {activeTab === 'billing' && <BillingTab />}
              {activeTab === 'danger'  && <DangerTab onDeleteAccount={handleDeleteAccount} />}

              {/* 저장 버튼 (billing/danger 제외) */}
              {(activeTab === 'profile' || activeTab === 'platform') && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  {saveError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <span>⚠️</span> {saveError}
                    </p>
                  )}
                  {saveOk && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5 fade-in-up">
                      <CheckCircle2 size={13} /> 저장됐습니다
                    </p>
                  )}
                  {!saveError && !saveOk && <span />}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? '저장 중...' : '변경사항 저장'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
