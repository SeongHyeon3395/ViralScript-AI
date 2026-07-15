'use client';

import { useState, useEffect } from 'react';
import {
  Gift, Copy, Check, Users, Share2, Sparkles, Send, Link2,
  ChevronRight, X, Zap,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { t } from './LanguageSwitcher';
import type { User } from '@supabase/supabase-js';

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface ReferralSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── 10자리 고유 코드 생성 (숫자+대문자 혼합) ─────────────────
function generateReferralCode(seed: string): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  const hash = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = 0; i < 10; i++) {
    code += chars[(hash * (i + 1) * 7 + i * 13) % chars.length];
  }
  return code;
}

export default function ReferralSystem({ isOpen, onClose }: ReferralSystemProps) {
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setReferralCode(generateReferralCode(user.id));
      }
    });
  }, [isOpen]);

  const referralLink = user ? `https://viralscript.ai/ref/${referralCode}` : '';

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong rounded-3xl fade-in-up overflow-y-auto max-h-[90vh]">
        {/* Gradient top */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        {/* Close — 항상 상단 고정, 화면 크기 무관 */}
        <button onClick={onClose} className="sticky top-3 left-[calc(100%-3rem)] z-10 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all ml-auto mr-3">
          <X size={18} />
        </button>

        <div className="px-6 pb-8 -mt-2">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <Users size={26} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('referral_title')}</h2>
            <p className="text-sm text-white/40 mt-1">
              {t('referral_desc')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: t('referral_invited_friends'), value: '0명', icon: Users, color: 'text-violet-400' },
              { label: t('referral_credits_earned'), value: '0개', icon: Zap, color: 'text-amber-400' },
              { label: t('referral_max_earn'), value: '∞', icon: Sparkles, color: 'text-emerald-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Icon size={16} className={`mx-auto mb-1 ${color}`} />
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-white/30">{label}</p>
              </div>
            ))}
          </div>

          {/* Referral code */}
          <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs text-white/40 mb-2 font-medium">{t('referral_my_code')}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <span className="text-lg font-bold tracking-widest gradient-text">{referralCode || '----------'}</span>
              </div>
              <button onClick={copyLink} className="w-11 h-11 rounded-xl flex items-center justify-center transition-all" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-violet-400" />}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { icon: Share2, label: t('referral_share'), color: 'from-violet-600 to-indigo-600' },
              { icon: Send, label: t('referral_kakao'), color: 'from-yellow-500 to-yellow-600' },
              { icon: TwitterIcon, label: t('referral_twitter'), color: 'from-sky-500 to-blue-500' },
            ].map(({ icon: Icon, label, color }) => (
              <button key={label} onClick={copyLink} className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium text-white/60 hover:text-white transition-all bg-white/5 hover:bg-white/10 border border-white/10">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}><Icon size={14} className="text-white" /></div>
                {label}
              </button>
            ))}
          </div>

          {/* How it works */}
          <div className="space-y-3 mb-6">
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{t('referral_how')}</p>
            {[
              { num: '1', title: t('referral_step1_title'), desc: t('referral_step1_desc') },
              { num: '2', title: t('referral_step2_title'), desc: t('referral_step2_desc') },
              { num: '3', title: t('referral_step3_title'), desc: t('referral_step3_desc') },
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5"><span className="text-xs font-bold text-white">{num}</span></div>
                <div><p className="text-sm font-semibold text-white">{title}</p><p className="text-xs text-white/40">{desc}</p></div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button onClick={copyLink} className="btn-primary w-full flex items-center justify-center gap-2"><Link2 size={16} />{copied ? t('referral_copied') : t('referral_copy_link')}<ChevronRight size={15} /></button>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mt-6" />
        </div>
      </div>
    </div>
  );
}