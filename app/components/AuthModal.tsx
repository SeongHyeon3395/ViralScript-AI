'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';

type AuthMode = 'login' | 'signup' | 'forgot';

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setEmail('');
    setPassword('');
    setPasswordError('');
    setName('');
    setShowPassword(false);
    setMessage(null);
    setEmailSent(false);
  }

  function switchMode(newMode: AuthMode) {
    resetForm();
    setMode(newMode);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    // 비밀번호 특수문자 검증
    if ((mode === 'signup' || mode === 'login') && password && !/[!@#$%^&*(),.?":{}|<>~`_\-+=\[\]\\;'/]/.test(password)) {
      setPasswordError(t('auth_password_special_char'));
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === 'signup') {
        // ── 회원가입: Supabase 이메일 인증 ──
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          setEmailSent(true);
          setMessage({ type: 'success', text: t('auth_signup_success') });
        }
      } else if (mode === 'login') {
        // ── 로그인 ──
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setMessage({ type: 'error', text: t('auth_email_not_confirmed') });
          } else {
            setMessage({ type: 'error', text: error.message });
          }
        } else {
          setMessage({ type: 'success', text: t('auth_login_success') });
          setTimeout(onClose, 1200);
        }
      } else if (mode === 'forgot') {
        // ── 비밀번호 재설정 ──
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-strong rounded-2xl shadow-2xl fade-in-up overflow-hidden">
        {/* Top gradient line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent" />

        {/* Header */}
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
          {/* Form */}
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

            {/* Message */}
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

          {/* Switch mode */}
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

          {/* Terms */}
          {mode === 'signup' && (
            <p className="text-center text-xs text-white/20">
              {t('auth_agree_terms')}
            </p>
          )}
        </div>

        {/* Bottom gradient line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      </div>
    </div>
  );
}
