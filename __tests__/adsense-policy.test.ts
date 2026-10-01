import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAdSenseContentPath } from '../lib/adsense';
import { GUIDE_CATALOG, LEARNING_LANGUAGES } from '../lib/learning/catalog';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('AdSense serving boundaries', () => {
  it('does not permit ads on functional, login, empty, administrative, or unknown pages', () => {
    for (const path of ['/', '/generator', '/pricing', '/history', '/settings', '/Master', '/privacy', '/terms', '/trends', '/auth/callback', '/learn', '/learn/en', '/about/en', '/learn/en/unknown', '/learn/xx/write-a-brief', '/learn/en/write-a-brief/edit']) {
      expect(isAdSenseContentPath(path), path).toBe(false);
    }
  });

  it('permits the published article routes in every supported language', () => {
    for (const language of LEARNING_LANGUAGES) {
      for (const { slug } of GUIDE_CATALOG) expect(isAdSenseContentPath(`/learn/${language}/${slug}`)).toBe(true);
    }
  });

  it('defaults to no ad serving even with a valid publisher and display slot', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-7452929426092517');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT', '1234567890');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', undefined);
    const config = await import('../lib/adsense');
    expect(config.adsensePublisherConfigured).toBe(true);
    expect(config.adsenseServingEnabled).toBe(false);
  });

  it('requires explicit approval-time opt in, not a truthy string such as false', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'false');
    expect((await import('../lib/adsense')).adsenseServingEnabled).toBe(false);
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SERVING_ENABLED', 'true');
    expect((await import('../lib/adsense')).adsenseServingEnabled).toBe(true);
  });
});
