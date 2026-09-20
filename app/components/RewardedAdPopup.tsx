'use client';

import { useEffect, useState } from 'react';
import { Check, Clapperboard, Play, X } from 'lucide-react';
import { t } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';

const DEMO_SECONDS = 15;

interface RewardedAdPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoComplete: () => void;
}

// This is a visual product-flow demo, not an ad impression or reward signal.
// Never connect its timer or close button to the real credit ledger.
export default function RewardedAdPopup({ isOpen, onClose, onDemoComplete }: RewardedAdPopupProps) {
  if (!isOpen) return null;
  return <AdFlowDemo onClose={onClose} onDemoComplete={onDemoComplete} />;
}

function AdFlowDemo({ onClose, onDemoComplete }: Omit<RewardedAdPopupProps, 'isOpen'>) {
  useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(DEMO_SECONDS);
  const complete = secondsLeft === 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="ad-demo-title" aria-describedby="ad-demo-notice" className="w-full max-w-md overflow-hidden rounded-3xl border border-violet-400/25 bg-[#11121b] shadow-2xl shadow-violet-950/50">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">{t('ads_demo_badge')}</p>
            <h2 id="ad-demo-title" className="mt-1 text-sm font-bold text-white">{t('ads_demo_title')}</h2>
          </div>
          {complete ? <button type="button" onClick={onDemoComplete} aria-label={t('ads_demo_finish')} className="rounded-full border border-emerald-300/35 bg-emerald-400/15 p-2 text-emerald-100 hover:bg-emerald-400/25"><X size={19} /></button> : <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-white/60">{secondsLeft}s</span>}
        </div>

        <div className="p-5">
          <div className="relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-violet-300/20 bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,.42),transparent_46%),linear-gradient(145deg,#242044,#0b1627_75%)] p-6">
            <div className="absolute -right-8 top-16 h-40 w-40 rounded-full border border-cyan-300/20" aria-hidden="true" />
            <div className="absolute right-2 top-24 h-28 w-28 rounded-full border border-violet-300/25" aria-hidden="true" />
            <div className="relative flex items-center justify-between"><span className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[10px] font-bold tracking-widest text-white/80">{t('ads_demo_label')}</span><Clapperboard size={20} className="text-cyan-200" /></div>
            <div className="relative"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/25 bg-white/10 text-white shadow-lg"><Play size={24} fill="currentColor" /></div><p className="text-2xl font-black leading-tight text-white">{t('ads_demo_creative')}</p><p className="mt-2 max-w-xs text-sm text-white/65">{t('ads_demo_creative_desc')}</p></div>
            <p className="relative text-[10px] font-medium uppercase tracking-widest text-white/45">{t('ads_demo_not_real')}</p>
          </div>
          <div className="mt-5" role="status" aria-live="polite">
            <div className="flex justify-between text-xs"><span className="font-semibold text-white/75">{complete ? t('ads_demo_ready') : t('ads_demo_wait')}</span><span className="font-mono text-cyan-200">{Math.round((DEMO_SECONDS - secondsLeft) / DEMO_SECONDS * 100)}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={DEMO_SECONDS - secondsLeft} aria-valuemin={0} aria-valuemax={DEMO_SECONDS} aria-label={t('ads_demo_progress')}><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-500" style={{ width: `${(DEMO_SECONDS - secondsLeft) / DEMO_SECONDS * 100}%` }} /></div>
          </div>
          <p id="ad-demo-notice" className="mt-4 text-xs leading-5 text-amber-100/70">{t('ads_demo_notice')}</p>
          {complete ? <button type="button" onClick={onDemoComplete} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-[#09221d] hover:bg-emerald-400"><Check size={16} />{t('ads_demo_finish')}</button> : <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/65 hover:bg-white/5">{t('ads_demo_leave')}</button>}
        </div>
      </section>
    </div>
  );
}
