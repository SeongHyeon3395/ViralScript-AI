'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Search,
  Send,
  RefreshCw,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';
import { REFERRAL_STORAGE_KEY } from './GoogleProfileCompletion';

type AuthMode = 'login' | 'signup' | 'forgot' | 'find_email' | 'suspended';

const PHONE_COUNTRIES = [
  ['US', '+1', 'United States'], ['KR', '+82', 'South Korea'], ['CA', '+1', 'Canada'], ['JP', '+81', 'Japan'], ['CN', '+86', 'China'], ['TW', '+886', 'Taiwan'], ['HK', '+852', 'Hong Kong'],
  ['GB', '+44', 'United Kingdom'], ['DE', '+49', 'Germany'], ['FR', '+33', 'France'], ['IT', '+39', 'Italy'], ['ES', '+34', 'Spain'], ['PT', '+351', 'Portugal'], ['NL', '+31', 'Netherlands'], ['BE', '+32', 'Belgium'], ['CH', '+41', 'Switzerland'], ['AT', '+43', 'Austria'], ['SE', '+46', 'Sweden'], ['NO', '+47', 'Norway'], ['DK', '+45', 'Denmark'], ['FI', '+358', 'Finland'], ['IE', '+353', 'Ireland'], ['PL', '+48', 'Poland'], ['CZ', '+420', 'Czech Republic'], ['HU', '+36', 'Hungary'], ['RO', '+40', 'Romania'], ['GR', '+30', 'Greece'], ['UA', '+380', 'Ukraine'], ['RU', '+7', 'Russia'],
  ['AU', '+61', 'Australia'], ['NZ', '+64', 'New Zealand'], ['IN', '+91', 'India'], ['SG', '+65', 'Singapore'], ['MY', '+60', 'Malaysia'], ['TH', '+66', 'Thailand'], ['VN', '+84', 'Vietnam'], ['PH', '+63', 'Philippines'], ['ID', '+62', 'Indonesia'], ['KH', '+855', 'Cambodia'], ['LA', '+856', 'Laos'], ['MM', '+95', 'Myanmar'], ['BD', '+880', 'Bangladesh'], ['PK', '+92', 'Pakistan'], ['LK', '+94', 'Sri Lanka'], ['NP', '+977', 'Nepal'], ['MN', '+976', 'Mongolia'],
  ['AE', '+971', 'United Arab Emirates'], ['SA', '+966', 'Saudi Arabia'], ['IL', '+972', 'Israel'], ['TR', '+90', 'Turkey'], ['IR', '+98', 'Iran'], ['IQ', '+964', 'Iraq'], ['QA', '+974', 'Qatar'], ['KW', '+965', 'Kuwait'], ['BH', '+973', 'Bahrain'], ['JO', '+962', 'Jordan'], ['EG', '+20', 'Egypt'], ['ZA', '+27', 'South Africa'], ['NG', '+234', 'Nigeria'], ['KE', '+254', 'Kenya'], ['MA', '+212', 'Morocco'],
  ['BR', '+55', 'Brazil'], ['MX', '+52', 'Mexico'], ['AR', '+54', 'Argentina'], ['CL', '+56', 'Chile'], ['CO', '+57', 'Colombia'], ['PE', '+51', 'Peru'], ['VE', '+58', 'Venezuela'], ['CR', '+506', 'Costa Rica'], ['PA', '+507', 'Panama'], ['DO', '+1', 'Dominican Republic'], ['JM', '+1', 'Jamaica'],
] as const;

function FlagIcon({ countryCode }: { countryCode: string }) {
  return <span className={`fi fi-${countryCode.toLowerCase()} h-4 w-6 shrink-0 rounded-sm`} aria-hidden="true" />;
}

function CountrySelect({ value, countryIso, onChange }: { value: string; countryIso: string; onChange: (dial: string, iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = PHONE_COUNTRIES.find(([code, dial]) => code === countryIso && dial === value) ?? PHONE_COUNTRIES[0];

  return (
    <div className="relative w-full">
      <button type="button" aria-label={t('signup_country_label')} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-left text-sm text-white hover:border-white/25">
        <FlagIcon countryCode={selected[0]} />
        <span className="truncate">{selected[0]} {selected[1]} {selected[2]}</span>
        <ChevronDown size={14} className={`ml-auto shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close country list" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div role="listbox" className="absolute left-0 top-full z-50 mt-2 max-h-64 w-[min(360px,calc(100vw-4rem))] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-2xl">
            {PHONE_COUNTRIES.map(([code, dial, name]) => (
              <button key={`${code}-${dial}`} type="button" role="option" aria-selected={value === dial && countryIso === code} onClick={() => { onChange(dial, code); setOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10">
                <FlagIcon countryCode={code} />
                <span className="whitespace-nowrap">{code} {dial}</span>
                <span className="truncate text-white/55">{name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const VERIFY_TIMEOUT = 180; // 3분
const RESEND_AFTER = 60; // 1분 후 재전송 활성화

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  useLanguage();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [name, setName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [phoneCountryIso, setPhoneCountryIso] = useState('US');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealStatus, setAppealStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // ─── 이메일 찾기 상태 ───
  const [foundEmailResult, setFoundEmailResult] = useState<{ masked_email?: string } | null>(null);

  // ─── 이메일 인증 타이머 상태 ───
  const [verifyCountdown, setVerifyCountdown] = useState(VERIFY_TIMEOUT);
  const [verifyExpired, setVerifyExpired] = useState(false);
  const [resendEnabled, setResendEnabled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setPasswordError('');
    setName('');
    setPhoneCountryCode('+1');
    setPhoneCountryIso('US');
    setPhoneNumber('');
    setShowPassword(false);
    setMessage(null);
    setEmailSent(false);
    setSuspensionReason(null);
    setAppealMessage('');
    setAppealStatus('idle');
    setFoundEmailResult(null);
    setVerifyCountdown(VERIFY_TIMEOUT);
    setVerifyExpired(false);
    setResendEnabled(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const resetVerificationTimer = useCallback(() => {
    setVerifyCountdown(VERIFY_TIMEOUT);
    setVerifyExpired(false);
    setResendEnabled(false);
  }, []);

  // initialMode가 바뀌면 mode도 동기화
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      resetForm();
      setReferralCode(new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() ?? '');
      setMode(initialMode);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialMode, resetForm]);

  // 인증 카운트다운 타이머
  useEffect(() => {
    if (!emailSent) return;

    timerRef.current = setInterval(() => {
      setVerifyCountdown((c) => {
        if (c <= 1) {
          setVerifyExpired(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        if (c <= VERIFY_TIMEOUT - RESEND_AFTER) setResendEnabled(true);
        return c - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [emailSent]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, []);

  function switchMode(newMode: AuthMode) {
    resetForm();
    setMode(newMode);
  }

  async function signInWithGoogle() {
    setLoading(true);
    setMessage(null);
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && /^[A-F0-9]{12}$/i.test(ref)) window.sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setMessage({ type: 'error', text: t('google_login_failed') });
      setLoading(false);
    }
  }

  async function submitSuspensionAppeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppealStatus('sending');
    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'suspension_appeal', appealEmail: email.trim(), message: appealMessage }),
      });
      if (!response.ok) throw new Error();
      setAppealMessage(''); setAppealStatus('success');
    } catch {
      setAppealStatus('error');
    }
  }

  // ─── 메인 폼 제출 ───
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (mode === 'signup' && password && !/[!@#$%^&*(),.?":{}|<>~`_\-+=\[\]\\;'/]/.test(password)) {
      setPasswordError(t('auth_password_special_char'));
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === 'signup') {
        const normalizedReferralCode = referralCode.trim().toUpperCase();
        if (normalizedReferralCode) {
          const validationResponse = await fetch(`/api/v1/referrals?code=${encodeURIComponent(normalizedReferralCode)}`);
          const validation = await validationResponse.json() as { valid?: boolean };
          if (!validationResponse.ok || !validation.valid) {
            setMessage({ type: 'error', text: t('referral_code_invalid') });
            setLoading(false);
            return;
          }
        }
        // 이메일 중복 체크: Supabase signUp은 기존 이메일에 대해 identities가 빈 배열을 반환
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'https://viralscript-ai-inky.vercel.app'}/auth/callback`,
            data: {
              full_name: name || undefined,
              phone_country_code: phoneCountryCode,
              phone_number: phoneNumber,
              referral_code: normalizedReferralCode || undefined,
            },
          },
        });

        if (error) {
          const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          setMessage({ type: 'error', text: msg || t('auth_network_error') });
          setLoading(false);
          return;
        }

        // Supabase v2: 이미 가입된 이메일이면 user.identities가 빈 배열
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          setMessage({ type: 'error', text: t('auth_email_already_exists') });
          setLoading(false);
          return;
        }

        // signUp 성공 → 이메일 인증 안내 화면 + 타이머 시작
        resetVerificationTimer();
        setEmailSent(true);
        setMessage({ type: 'success', text: t('auth_email_sent_desc') });
        setLoading(false);
        return;
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          if (msg.toLowerCase().includes('banned')) {
            setMode('suspended');
          } else if (msg.toLowerCase().includes('email not confirmed')) {
            setMessage({ type: 'error', text: t('auth_email_not_confirmed') });
          } else if (error.code === 'invalid_credentials' || msg.toLowerCase().includes('invalid login credentials')) {
            setMessage({ type: 'error', text: t('auth_invalid_credentials') });
          } else {
            setMessage({ type: 'error', text: t('auth_network_error') });
          }
        } else {
          const token = data.session?.access_token;
          const statusResponse = token ? await fetch('/api/v1/profile', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }) : null;
          if (statusResponse?.status === 403) {
            const status = await statusResponse.json() as { suspensionReason?: string | null };
            setSuspensionReason(status.suspensionReason ?? null);
            await supabase.auth.signOut({ scope: 'local' });
            setMode('suspended');
          } else {
            setMessage({ type: 'success', text: t('auth_login_success') });
            setTimeout(onClose, 1200);
          }
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });

        if (error) {
          const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          setMessage({ type: 'error', text: msg || t('auth_network_error') });
        } else {
          resetVerificationTimer();
          setEmailSent(true);
          setMessage({ type: 'success', text: t('auth_signup_success') });
        }
      }
    } catch {
      setMessage({ type: 'error', text: t('auth_network_error') });
    } finally {
      setLoading(false);
    }
  }

  // ─── 전화번호 기반 이메일 찾기 ───
  async function handleFindEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phoneNumber) return;
    setLoading(true);
    setMessage(null);
    setFoundEmailResult(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: Array<{ masked_email: string }> | null; error: { message: string } | null }>)('find_email_by_phone', {
        p_full_name: name,
        p_phone_country_code: phoneCountryCode,
        p_phone_number: phoneNumber,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message || t('auth_network_error') });
      } else if (data && data.length > 0) {
        setFoundEmailResult(data[0]);
      } else {
        setMessage({ type: 'error', text: t('find_email_not_found') });
      }
    } catch {
      setMessage({ type: 'error', text: t('auth_network_error') });
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md glass-strong rounded-2xl shadow-2xl fade-in-up overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

        {/* ─── 이메일 인증 발송 완료 화면 + 타이머 ─── */}
        {emailSent && mode === 'signup' ? (
          <div className="px-8 py-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Send size={26} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('auth_email_sent_title')}</h2>
            <p className="text-sm text-white/50 leading-relaxed">
              {t('auth_email_sent_desc')}
            </p>

            {/* 3분 카운트다운 타이머 */}
            <div className="flex items-center justify-center gap-2">
              <Clock size={14} className={verifyExpired ? 'text-red-400' : 'text-white/40'} />
              <span className={`text-lg font-mono font-bold ${verifyExpired ? 'text-red-400' : 'text-white/60'}`}>
                {formatTime(verifyCountdown)}
              </span>
            </div>

            {/* 만료 경고 */}
            {verifyExpired && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/20 text-red-300 fade-in-up">
                <AlertCircle size={15} className="shrink-0" />
                {t('auth_verify_expired')}
              </div>
            )}

            {message && !verifyExpired && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                {message.type === 'success' ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
                {message.text}
              </div>
            )}

            {/* 재전송 버튼 (1분 후 활성화) */}
            <button
              onClick={async () => {
                if (!resendEnabled || loading) return;
                setLoading(true);
                try {
                  const supabase = getSupabaseBrowserClient();
                  await supabase.auth.resend({ type: 'signup', email });
                  resetVerificationTimer();
                  if (timerRef.current) clearInterval(timerRef.current);
                  // re-trigger timer
                  setEmailSent(false);
                  setTimeout(() => setEmailSent(true), 50);
                  setMessage({ type: 'success', text: t('auth_email_resent') });
                } catch {
                  setMessage({ type: 'error', text: t('auth_network_error') });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!resendEnabled || loading}
              className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={12} />
              {resendEnabled ? t('auth_resend_email') : t('auth_resend_wait')}
            </button>

            {/* 만료 시 처음부터 다시 */}
            {verifyExpired ? (
              <button
                onClick={() => switchMode('signup')}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                {t('auth_retry_signup')}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors py-2"
              >
                {t('close')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ─── 기존 로그인/회원가입/비밀번호 찾기 화면 ─── */}
            <div className="px-8 pt-8 pb-0 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">ViralScript AI</span>
                </div>
                <h2 className="text-2xl font-bold text-white mt-3">
                  {mode === 'login' && t('auth_welcome_back')}
                  {mode === 'signup' && t('auth_nice_to_meet')}
                  {mode === 'forgot' && t('auth_reset_password')}
                  {mode === 'find_email' && t('find_email_title')}
                  {mode === 'suspended' && t('auth_suspended_title')}
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {mode === 'login' && t('auth_login_desc')}
                  {mode === 'signup' && t('auth_signup_desc')}
                  {mode === 'forgot' && t('auth_forgot_desc')}
                  {mode === 'find_email' && t('find_email_desc')}
                  {mode === 'suspended' && t('auth_suspended_desc')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                aria-label={t('auth_close')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-8 py-6 space-y-4">
              {mode === 'suspended' ? (
                <form onSubmit={(event) => void submitSuspensionAppeal(event)} className="space-y-3">
                  {suspensionReason && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100"><p className="text-xs font-semibold text-amber-300">{t('auth_suspended_reason')}</p><p className="mt-1">{suspensionReason}</p></div>}
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-label={t('auth_email_placeholder')} placeholder={t('auth_email_placeholder')} className="w-full rounded-xl input-dark px-4 py-3 text-sm" />
                  <textarea value={appealMessage} onChange={(event) => setAppealMessage(event.target.value)} required minLength={10} maxLength={5000} placeholder={t('auth_suspended_appeal_placeholder')} className="min-h-28 w-full rounded-xl input-dark px-4 py-3 text-sm" />
                  {appealStatus === 'success' && <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">{t('auth_suspended_appeal_success')}</p>}
                  {appealStatus === 'error' && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{t('auth_suspended_appeal_error')}</p>}
                  <button type="submit" disabled={appealStatus === 'sending' || appealMessage.trim().length < 10} className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:opacity-50">{appealStatus === 'sending' && <Loader2 size={16} className="animate-spin" />}{t('auth_suspended_appeal')}</button>
                </form>
              ) : mode === 'find_email' ? (
                <form onSubmit={handleFindEmail} className="space-y-3">
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('auth_name_placeholder')}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl input-dark text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="pl-1 text-xs font-medium text-white/55">{t('signup_country_label')}</p>
                    <CountrySelect value={phoneCountryCode} countryIso={phoneCountryIso} onChange={(dial, iso) => { setPhoneCountryCode(dial); setPhoneCountryIso(iso); }} />
                    <div className="space-y-1.5">
                      <label htmlFor="find-email-phone-number" className="block pl-1 text-xs font-medium text-white/55">{t('signup_phone_label')}</label>
                      <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        id="find-email-phone-number"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={t('find_email_phone_placeholder')}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl input-dark text-sm"
                      />
                      </div>
                    </div>
                  </div>

                  {foundEmailResult && (
                    <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 text-center space-y-1 fade-in-up">
                      <p className="text-xs text-white/50">{t('find_email_result_label')}</p>
                      <p className="text-base font-bold text-violet-300">{foundEmailResult.masked_email}</p>
                    </div>
                  )}

                  {message && (
                    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                      {message.type === 'success' ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={15} /> {t('find_email_search_btn')}</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {mode === 'signup' && (
                    <>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t('auth_name_placeholder')}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl input-dark text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="pl-1 text-xs font-medium text-white/55">{t('signup_country_label')}</p>
                        <CountrySelect value={phoneCountryCode} countryIso={phoneCountryIso} onChange={(dial, iso) => { setPhoneCountryCode(dial); setPhoneCountryIso(iso); }} />

                        <div className="space-y-1.5">
                          <label htmlFor="signup-phone-number" className="block pl-1 text-xs font-medium text-white/55">{t('signup_phone_label')}</label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                              id="signup-phone-number"
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel-national"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder={t('signup_phone_placeholder')}
                              required
                              className="w-full pl-10 pr-4 py-3 rounded-xl input-dark text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/40 pl-1">
                        {t('signup_phone_disclaimer')}
                      </p>
                    </>
                  )}

                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth_email_placeholder')}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl input-dark text-sm"
                    />
                  </div>

                  {mode !== 'forgot' && (
                    <div>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('auth_password_placeholder')}
                          required
                          minLength={mode === 'signup' ? 8 : undefined}
                          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                          aria-describedby={mode === 'signup' ? 'signup-password-requirements' : undefined}
                          className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm ${passwordError ? 'border-red-500/60 ring-1 ring-red-500/30' : 'input-dark'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={t(showPassword ? 'settings_hide_password' : 'settings_show_password')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md text-white/30 transition-colors hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {mode === 'signup' && (
                        <div id="signup-password-requirements" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-1 text-xs" aria-live="polite">
                          <span className={`flex items-center gap-1 ${password.length >= 8 ? 'text-emerald-300' : 'text-white/55'}`}>
                            {password.length >= 8 ? <CheckCircle2 size={13} aria-hidden="true" /> : <span aria-hidden="true">•</span>}
                            {t('auth_password_minimum')}
                          </span>
                          <span className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>~`_\-+=\[\]\\;'/]/.test(password) ? 'text-emerald-300' : 'text-white/55'}`}>
                            {/[!@#$%^&*(),.?":{}|<>~`_\-+=\[\]\\;'/]/.test(password) ? <CheckCircle2 size={13} aria-hidden="true" /> : <span aria-hidden="true">•</span>}
                            {t('auth_password_special_required')}
                          </span>
                        </div>
                      )}
                      {passwordError && <p role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={13} aria-hidden="true" /> {passwordError}</p>}
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="cursor-pointer text-violet-400 hover:-translate-y-0.5 hover:text-violet-300 transition-all"
                      >
                        {t('auth_forgot_password_link')}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('find_email')}
                        className="cursor-pointer flex items-center gap-1 text-violet-400/60 hover:-translate-y-0.5 hover:text-violet-300 transition-all"
                      >
                        <HelpCircle size={12} />
                        {t('auth_forgot_email_link')}
                      </button>
                    </div>
                  )}

                  {message && (
                    <div className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}>
                      {message.type === 'success'
                        ? mode === 'login'
                          ? <Loader2 size={15} className="shrink-0 animate-spin" />
                          : <CheckCircle2 size={15} className="shrink-0" />
                        : <AlertCircle size={15} className="shrink-0" />}
                      {message.text}
                    </div>
                  )}

                  {mode === 'signup' && (
                    <div>
                      <label htmlFor="signup-referral-code" className="mb-1.5 block text-xs font-medium text-white/50">{t('referral_signup_label')}</label>
                      <input
                        id="signup-referral-code"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 12))}
                        placeholder={t('referral_signup_placeholder')}
                        autoComplete="off"
                        maxLength={12}
                        className="w-full rounded-xl input-dark px-4 py-3 text-sm uppercase tracking-widest"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        {mode === 'login' && t('auth_login_btn')}
                        {mode === 'signup' && t('auth_signup_btn')}
                        {mode === 'forgot' && t('auth_reset_btn')}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {mode === 'login' && (
                <button type="button" disabled={loading} onClick={() => void signInWithGoogle()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50">
                  <span aria-hidden="true" className="text-base font-bold text-[#4285F4]">G</span>
                  {t('google_login_button')}
                </button>
              )}

              <p className="text-center text-sm text-white/40">
                {mode === 'login' && (
                  <>
                    {t('auth_no_account')}{' '}
                    <button onClick={() => switchMode('signup')} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                      {t('auth_free_signup')}
                    </button>
                  </>
                )}
                {mode === 'signup' && (
                  <>
                    {t('auth_has_account')}{' '}
                    <button onClick={() => switchMode('login')} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                      {t('nav_login')}
                    </button>
                  </>
                )}
                {(mode === 'forgot' || mode === 'find_email' || mode === 'suspended') && (
                  <>
                    <button onClick={() => switchMode('login')} className="btn-primary-compact inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-2 text-sm">
                      <ArrowLeft size={14} />
                      {t('auth_back_to_login')}
                    </button>
                  </>
                )}
              </p>

              {mode === 'signup' && (
                <p className="text-center text-xs text-white/40">
                  {t('auth_agree_terms_prefix')}{' '}
                  <Link href="/terms" target="_blank" className="text-violet-400 underline hover:text-violet-300 transition-colors">
                    {t('terms_label')}
                  </Link>
                  {' '}{t('and_label')}{' '}
                  <Link href="/privacy" target="_blank" className="text-violet-400 underline hover:text-violet-300 transition-colors">
                    {t('privacy_label')}
                  </Link>
                  {t('auth_agree_terms_suffix')}
                </p>
              )}
            </div>
          </>
        )}

        <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      </div>
    </div>
  );
}
