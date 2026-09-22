export const TREND_FRESHNESS_MS = 48 * 60 * 60 * 1000;

export type TrendBucketStatus = 'fresh' | 'stale' | 'missing';
export type TrendBucketHealth = { region: 'KR' | 'US' | 'JP'; platform: 'youtube' | 'tiktok'; status: TrendBucketStatus; latestAt: string | null };

type TrendTimestamp = {
  platform: string;
  region: string;
  created_at?: string | null;
  // Database rows also carry updated_at. Freshness deliberately ignores it
  // because editing metadata must not make an old collection look fresh.
  updated_at?: string | null;
};

export function getTrendHealth(rows: TrendTimestamp[], now = Date.now()): TrendBucketHealth[] {
  const regions = ['KR', 'US', 'JP'] as const;
  const platforms = ['youtube', 'tiktok'] as const;
  return regions.flatMap((region) => platforms.map((platform) => {
    const latest = rows.reduce<number | null>((current, row) => {
      if (row.region !== region || !row.platform.toLowerCase().includes(platform)) return current;
      const timestamp = Date.parse(row.created_at ?? '');
      return Number.isFinite(timestamp) && (current === null || timestamp > current) ? timestamp : current;
    }, null);
    return {
      region,
      platform,
      status: latest === null ? 'missing' : now - latest > TREND_FRESHNESS_MS ? 'stale' : 'fresh',
      latestAt: latest === null ? null : new Date(latest).toISOString(),
    };
  }));
}
