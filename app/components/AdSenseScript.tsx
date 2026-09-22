import Script from 'next/script';

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? '';
const isConfigured = /^ca-pub-\d+$/.test(clientId);

/**
 * Loads AdSense once for the whole App Router tree. Auto Ads settings in the
 * AdSense console control desktop side rails and mobile anchor ads.
 */
export default function AdSenseScript() {
  if (!isConfigured) return null;

  return (
    <Script
      id="adsense-script"
      // AdSense site review asks for the publisher script in the document head.
      // In the root layout, beforeInteractive is emitted in <head> by Next.js.
      strategy="beforeInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
    />
  );
}
