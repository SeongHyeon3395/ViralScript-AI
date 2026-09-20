import { describe, expect, it } from 'vitest';
import { getTrendHealth, TREND_FRESHNESS_MS } from '@/lib/trendHealth';

const now = Date.parse('2026-09-20T12:00:00.000Z');

describe('trend freshness by region and platform', () => {
  it('checks all six buckets and uses collection time, not metadata update time', () => {
    const health = getTrendHealth([
      { region: 'KR', platform: 'YouTube Shorts', created_at: new Date(now - 60_000).toISOString() },
      { region: 'KR', platform: 'TikTok', created_at: new Date(now - TREND_FRESHNESS_MS - 1).toISOString(), updated_at: new Date(now).toISOString() },
    ], now);

    expect(health).toHaveLength(6);
    expect(health.find((bucket) => bucket.region === 'KR' && bucket.platform === 'youtube')?.status).toBe('fresh');
    expect(health.find((bucket) => bucket.region === 'KR' && bucket.platform === 'tiktok')?.status).toBe('stale');
    expect(health.find((bucket) => bucket.region === 'US' && bucket.platform === 'youtube')?.status).toBe('missing');
  });

  it('treats invalid timestamps as missing rather than fresh', () => {
    const health = getTrendHealth([{ region: 'JP', platform: 'TikTok', created_at: 'invalid' }], now);
    expect(health.find((bucket) => bucket.region === 'JP' && bucket.platform === 'tiktok')?.status).toBe('missing');
  });
});
