'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from './LanguageProvider';

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? '';
const slotId = process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT?.trim() ?? '';
export const isAdSenseDisplayConfigured = /^ca-pub-\d+$/.test(clientId) && /^\d+$/.test(slotId);

/**
 * A regular AdSense display slot. It never reports a completed ad view and is
 * intentionally separate from the credit reward flow.
 */
export default function AdSenseDisplayAd({ testMode = false }: { testMode?: boolean }) {
  const { language } = useLanguage();
  const attempted = useRef(false);
  const label = { en: 'Advertisement', ko: '광고', ja: '広告', zh: '广告' }[language];

  useEffect(() => {
    if (!isAdSenseDisplayConfigured || attempted.current) return;
    attempted.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // An unavailable test inventory must not affect page functionality.
    }
  }, []);

  if (!isAdSenseDisplayConfigured) return null;

  return (
    <aside aria-label={label} className="mx-auto mt-4 max-w-4xl rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 sm:mt-5">
      <p className="mb-1 text-center text-[9px] font-medium uppercase tracking-widest text-white/25">{label}</p>
      <ins className="adsbygoogle block h-[50px] overflow-hidden sm:h-[90px]" style={{ display: 'block' }} data-ad-client={clientId} data-ad-slot={slotId} data-ad-format="horizontal" data-full-width-responsive="true" data-adtest={testMode ? 'on' : undefined} />
    </aside>
  );
}
