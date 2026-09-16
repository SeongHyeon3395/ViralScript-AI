'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { useLanguage } from './LanguageProvider';

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? '';
const slotId = process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT?.trim() ?? '';
const configured = /^ca-pub-\d+$/.test(clientId) && /^\d+$/.test(slotId);

/**
 * A regular AdSense display slot. It never reports a completed ad view and is
 * intentionally separate from the credit reward flow.
 */
export default function AdSenseDisplayAd() {
  const { language } = useLanguage();
  const attempted = useRef(false);
  const label = { en: 'Advertisement', ko: '광고', ja: '広告', zh: '广告' }[language];

  useEffect(() => {
    if (!configured || attempted.current) return;
    attempted.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // An unavailable test inventory must not affect page functionality.
    }
  }, []);

  if (!configured) return null;

  return (
    <aside aria-label={label} className="mx-auto mt-8 max-w-4xl rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-widest text-white/25">{label}</p>
      <Script id="adsense-display-script" strategy="afterInteractive" async crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`} />
      <ins className="adsbygoogle block" style={{ display: 'block' }} data-ad-client={clientId} data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
