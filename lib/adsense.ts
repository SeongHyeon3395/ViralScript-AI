export const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? '';
export const adsenseSlotId = process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT?.trim() ?? '';
export const adsensePublisherConfigured = /^ca-pub-\d{16}$/.test(adsenseClientId);

// Opt in only after the AdSense site has reached Ready. Ownership verification
// uses the head meta tag and ads.txt independently of ad serving.
export const adsenseServingEnabled = process.env.NEXT_PUBLIC_ADSENSE_SERVING_ENABLED === 'true';

export function isAdSenseContentPath(pathname: string): boolean {
  return /^\/learn\/(en|ko|ja|zh)\/(write-a-brief|cafe-storyboard|reference-to-original)\/?$/.test(pathname);
}
