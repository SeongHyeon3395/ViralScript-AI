'use client';

import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { t } from './LanguageSwitcher';
import { useLanguage } from './LanguageProvider';
import AdSenseDisplayAd from './AdSenseDisplayAd';

interface RewardedAdPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed: (credits: number) => void;
  rewardAmount?: number;
}

/**
 * Test mode loads the configured regular AdSense display slot so the entry
 * points and ad rendering can be verified. It never treats a browser event as
 * proof of viewing, and it never awards credits.
 */
export default function RewardedAdPopup({ isOpen, onClose }: RewardedAdPopupProps) {
  useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="ad-reward-test-title" className="w-full max-w-sm rounded-3xl border border-amber-500/25 bg-[#10121b] p-7 text-center shadow-2xl">
        <button type="button" onClick={onClose} aria-label={t('close')} className="float-right rounded-lg p-1 text-white/45 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-300"><AlertCircle size={25} /></div>
        <h2 id="ad-reward-test-title" className="mt-5 text-lg font-bold text-white">{t('ads_test_title')}</h2>
        <p className="mt-2 text-sm leading-6 text-white/50">{t('ads_test_notice')}</p>
        <AdSenseDisplayAd />
        <button type="button" onClick={onClose} className="btn-primary-compact mt-6 px-5 py-2.5 text-sm">{t('close')}</button>
      </section>
    </div>
  );
}
