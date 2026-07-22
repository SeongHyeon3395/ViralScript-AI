'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';

type AuthMode = 'login' | 'signup' | 'forgot' | 'otp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 180; // 3분
const RESEND_COOLDOWN_SECONDS = 60; // 1분

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // ─── OTP 상태 ───
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [otpExpired, setOtpExpired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── OTP 카운트다운 타이머 ───
  useEffect(() => {
    if (mode !== 'otp' || otpExpired) return;
    const id = setInterval(() => {
      setOtpCountdown((c) => {
        if (c <= 1) {
          setOtpExpired(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [mode, otpExpired]);

  // ─── 재발송 쿨다운 타이머 ───
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) return 0;
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  function resetForm() {
    setEmail('');
    setPassword('');
    setPasswordError('');
    setName('');
    setShowPassword(false);
    setMessage(null);
    setEmailSent(false);
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setOtpError('');
    setOtpCountdown(OTP_EXPIRY_SECONDS);
    setOtpExpired(false);
    setResendCooldown(0);
  }

  function switchMode(newMode: AuthMode) {
    resetForm();
    setMode(newMode);
  }

  // ─── OTP 입력 핸들러 ───
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');

    // 다음 칸으로 자동 포커스
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  const otpToken = otpDigits.join('');
  const isOtpComplete = otpToken.length === OTP_LENGTH;

  // ─── OTP 인증번호 재발송 ───
  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setOtpError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || undefined } },
      });
      if (error) {
        const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
        setOtpError(msg || t('auth_network_error'));
      } else {
        setOtpCountdown(OTP_EXPIRY_SECONDS);
        setOtpExpired(false);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setMessage({ type: 'success', text: t('otp_desc').replace('{email}', email) });
      }
    } catch {
      setOtpError(t('auth_network_error'));
    } finally {
      setLoading(false);
    }
  }

  // ─── OTP 인증 검증 ───
  async function handleVerifyOtp() {
    if (!isOtpComplete || otpExpired || loading) return;
    setLoading(true);
    setOtpError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpToken,
        type: 'signup',
      });
      if (error) {
        setOtpError(t('otp_invalid'));
      } else {
        setMessage({ type: 'success', text: t('otp_verified') });
        setTimeout(onClose, 1200);
      }
    } catch {
      setOtpError(t('auth_network_error'));
    } finally {
      setLoading(false);
    }
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || undefined } },
        });

        if (error) {
          const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
          setMessage({ type: 'error', text: msg || t('auth_network_error') });
          setLoading(false);
          return;
        }

        // signUp 성공 → OTP 단계로 전환
        setMode('otp');
        setOtpCountdown(OTP_EXPIRY_SECONDS);
        setOtpExpired(false);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setMessage(null);
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

  // ─── 카운트다운 포맷 ───
  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

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

        {/* ─── OTP 인증 화면 ─── */}
        {mode === 'otp' ? (
          <div className="px-8 py-8 space-y-6">
            {/* Back button */}
            <button
              onClick={() => switchMode('signup')}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft size={14} />
              {t('otp_change_email')}
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20">
                <ShieldCheck size={26} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">{t('otp_title')}</h2>
              <p className="text-sm text-white/40">
                {t('otp_desc').replace('{email}', email)}
              </p>
            </div>

            {/* 6-digit OTP input */}
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={otpExpired}
                  className={`w-11 h-14 sm:w-12 sm:h-16 rounded-xl text-center text-xl font-bold transition-all outline-none ${
                    otpExpired
                      ? 'bg-white/5 border border-red-500/30 text-white/20 cursor-not-allowed'
                      : otpError
                      ? 'bg-white/5 border-2 border-red-500/60 text-white ring-1 ring-red-500/20'
                      : 'bg-white/5 border-2 border-white/10 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
                  }`}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2">
              <Clock size={14} className={otpExpired ? 'text-red-400' : 'text-white/40'} />
              <span className={`text-sm font-mono font-bold ${otpExpired ? 'text-red-400' : 'text-white/50'}`}>
                {formatTime(otpCountdown)}
              </span>
            </div>

            {/* OTP Error */}
            {otpError && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/20 text-red-300 fade-in-up">
                <AlertCircle size={15} className="shrink-0" />
                {otpError}
              </div>
            )}

            {/* Expired warning */}
            {otpExpired && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-amber-500/10 border border-amber-500/20 text-amber-300 fade-in-up">
                <AlertCircle size={15} className="shrink-0" />
                {t('otp_expired')}
              </div>
            )}

            {/* Verify button */}
            <button
              onClick={handleVerifyOtp}
              disabled={!isOtpComplete || otpExpired || loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {t('otp_verify_btn')}
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Resend button */}
            <div className="text-center">
              <button
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 disabled:text-white/20 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={12} className={resendCooldown > 0 ? '' : ''} />
                {resendCooldown > 0
                  ? t('otp_resend_cooldown').replace('{seconds}', String(resendCooldown))
                  : t('otp_resend_btn')}
              </button>
            </div>

            {/* Success message */}
            {message && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
                {message.text}
              </div>
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
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {mode === 'login' && t('auth_login_desc')}
                  {mode === 'signup' && t('auth_signup_desc')}
                  {mode === 'forgot' && t('auth_forgot_desc')}
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
              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'signup' && (
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
                      onClick={() => { setEmail(''); setMode('forgot'); setMessage({ type: 'error', text: t('auth_forgot_desc') }); }}
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
                {mode === 'forgot' && (
                  <>
                    <button onClick={() => switchMode('login')} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                      {t('auth_back_to_login')}
                    </button>
                  </>
                )}
              </p>

              {mode === 'signup' && (
                <p className="text-center text-xs text-white/20">
                  {t('auth_agree_terms')}
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
