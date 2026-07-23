'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
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
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';

type AuthMode = 'login' | 'signup' | 'forgot' | 'find_email';

const VERIFY_TIMEOUT = 180; // 3분
const RESEND_AFTER = 60; // 1분 후 재전송 활성화

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [name, setName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // ─── 이메일 찾기 상태 ───
  const [foundEmailResult, setFoundEmailResult] = useState<{ email?: string; masked_email?: string } | null>(null);

  // ─── 이메일 인증 타이머 상태 ───
  const [verifyCountdown, setVerifyCountdown] = useState(VERIFY_TIMEOUT);
  const [verifyExpired, setVerifyExpired] = useState(false);
  const [resendEnabled, setResendEnabled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // initialMode가 바뀌면 mode도 동기화
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setMode(initialMode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode]);

  // 인증 카운트다운 타이머
  useEffect(() => {
    if (!emailSent) return;
    setVerifyCountdown(VERIFY_TIMEOUT);
    setVerifyExpired(false);
    setResendEnabled(false);

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

  function resetForm() {
    setEmail('');
    setPassword('');
    setPasswordError('');
    setName('');
    setPhoneCountryCode('+82');
    setPhoneNumber('');
    setShowPassword(false);
    setMessage(null);
    setEmailSent(false);
    setFoundEmailResult(null);
    setVerifyCountdown(VERIFY_TIMEOUT);
    setVerifyExpired(false);
    setResendEnabled(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function switchMode(newMode: AuthMode) {
    resetForm();
    setMode(newMode);
  }

  // ─── 메인 폼 제출 ───
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if ((mode === 'signup' || mode === 'login') && password && !/[!@#$%^&*(),.?":{}|<>~`_\-+=\[\]\\;'/]/.test(password)) {
      setPasswordError(t('auth_password_special_char'));
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === 'signup') {
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
        setEmailSent(true);
        setMessage({ type: 'success', text: t('auth_email_sent_desc') });
        setLoading(false);
        return;
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          if (msg.toLowerCase().includes('email not confirmed')) {
            setMessage({ type: 'error', text: t('auth_email_not_confirmed') });
          } else {
            setMessage({ type: 'error', text: msg || t('auth_network_error') });
          }
        } else {
          setMessage({ type: 'success', text: t('auth_login_success') });
          setTimeout(onClose, 1200);
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });

        if (error) {
          const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          setMessage({ type: 'error', text: msg || t('auth_network_error') });
        } else {
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
      const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: Array<{ email: string; masked_email: string }> | null; error: { message: string } | null }>)('find_email_by_phone', {
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
                  setVerifyCountdown(VERIFY_TIMEOUT);
                  setVerifyExpired(false);
                  setResendEnabled(false);
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
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {mode === 'login' && t('auth_login_desc')}
                  {mode === 'signup' && t('auth_signup_desc')}
                  {mode === 'forgot' && t('auth_forgot_desc')}
                  {mode === 'find_email' && t('find_email_desc')}
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
              {mode === 'find_email' ? (
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

                  <div className="flex gap-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="px-3 py-3 rounded-xl input-dark text-base bg-zinc-900 border border-white/10 text-white min-w-[120px]"
                      >
                      <option value="+82">🇰🇷 +82 (KR)</option>
                      <option value="+1">🇺🇸 +1 (US)</option>
                      <option value="+81">🇯🇵 +81 (JP)</option>
                      <option value="+86">🇨🇳 +86 (CN)</option>
                    </select>

                    <div className="relative flex-1">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={t('find_email_phone_placeholder')}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl input-dark text-sm"
                      />
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

                      <div className="flex gap-2">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="px-3 py-3 rounded-xl input-dark text-base bg-zinc-900 border border-white/10 text-white min-w-[120px]"
                        >
                          <option value="+82">🇰🇷 +82</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+81">🇯🇵 +81</option>
                          <option value="+86">🇨🇳 +86</option>
                        </select>

                        <div className="relative flex-1">
                          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder={t('signup_phone_placeholder')}
                            required
                            className="w-full pl-10 pr-4 py-3 rounded-xl input-dark text-sm"
                          />
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
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth_password_placeholder')}
                        required
                        minLength={8}
                        className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm ${passwordError ? 'border-red-500/60 ring-1 ring-red-500/30' : 'input-dark'}`}
                      />
                      {passwordError && <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1"><span>⚠️</span> {passwordError}</p>}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        {t('auth_forgot_password_link')}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('find_email')}
                        className="text-violet-400/60 hover:text-violet-300 transition-colors flex items-center gap-1"
                      >
                        <HelpCircle size={12} />
                        {t('auth_forgot_email_link')}
                      </button>
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
                {(mode === 'forgot' || mode === 'find_email') && (
                  <>
                    <button onClick={() => switchMode('login')} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
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
