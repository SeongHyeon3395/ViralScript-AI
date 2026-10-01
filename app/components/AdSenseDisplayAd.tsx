'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from './LanguageProvider';
import { usePathname } from 'next/navigation';
import { adsenseClientId, adsenseSlotId, adsensePublisherConfigured, adsenseServingEnabled, isAdSenseContentPath } from '@/lib/adsense';

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

export const isAdSenseDisplayConfigured = adsensePublisherConfigured && /^\d+$/.test(adsenseSlotId);

/**
 * A regular AdSense display slot. It never reports a completed ad view and is
 * intentionally separate from the credit reward flow.
 */
export default function AdSenseDisplayAd({ testMode = false }: { testMode?: boolean }) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const allowed = isAdSenseDisplayConfigured && adsenseServingEnabled && isAdSenseContentPath(pathname);
  const attempted = useRef(false);
  const label = { en: 'Advertisement', ko: '광고', ja: '広告', zh: '广告' }[language];

  useEffect(() => {
    if (!allowed || attempted.current) return;
    attempted.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // An unavailable test inventory must not affect page functionality.
    }
  }, [allowed]);

  if (!allowed) return null;

  return (
    <aside aria-label={label} className="mx-auto mt-4 max-w-4xl rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 sm:mt-5">
      <p className="mb-1 text-center text-[9px] font-medium uppercase tracking-widest text-white/25">{label}</p>
      <ins className="adsbygoogle block min-h-[50px] sm:min-h-[90px]" style={{ display: 'block' }} data-ad-client={adsenseClientId} data-ad-slot={adsenseSlotId} data-ad-format="horizontal" data-full-width-responsive="true" data-adtest={testMode ? 'on' : undefined} />
    </aside>
  );
}
