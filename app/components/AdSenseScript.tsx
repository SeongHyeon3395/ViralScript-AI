'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { adsenseClientId, adsensePublisherConfigured, adsenseServingEnabled, isAdSenseContentPath } from '@/lib/adsense';

/**
 * Loaded only by public editorial articles after approval. Auto Ads must also
 * be disabled or restricted in the AdSense account; page exclusions do not
 * remove manually placed slots.
 */
export default function AdSenseScript() {
  const pathname = usePathname();
  if (!adsensePublisherConfigured || !adsenseServingEnabled || !isAdSenseContentPath(pathname)) return null;

  return (
    <Script
      id="adsense-script"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
    />
  );
}
