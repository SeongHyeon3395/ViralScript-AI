export interface TrendCandidate {
  platform: string;
  region: string;
  video_url: string;
}

export interface DailyTrendSelection<T extends TrendCandidate> {
  rows: T[];
  inserted: number;
  updated: number;
  insertedByBucket: Record<string, number>;
}

/**
 * Retain every currently discovered row for metadata refreshes, while choosing
 * up to the daily quota of previously unseen rows in each platform/region
 * bucket. Selecting after the existing-URL lookup is important: slicing the
 * source result first can otherwise keep refreshing the same top ten videos.
 */
export function selectDailyTrendRows<T extends TrendCandidate>(
  candidates: T[],
  existingKeys: ReadonlySet<string>,
  dailyNewTarget: number,
): DailyTrendSelection<T> {
  const buckets = new Map<string, T[]>();
  for (const candidate of candidates) {
    const bucket = `${candidate.platform}|${candidate.region}`;
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), candidate]);
  }

  const rows: T[] = [];
  const insertedByBucket: Record<string, number> = {};
  let inserted = 0;

  for (const [bucket, bucketCandidates] of buckets) {
    const fresh = bucketCandidates.filter((candidate) => !existingKeys.has(`${candidate.platform}|${candidate.video_url}`));
    const known = bucketCandidates.filter((candidate) => existingKeys.has(`${candidate.platform}|${candidate.video_url}`));
    const dailyFresh = fresh.slice(0, dailyNewTarget);
    insertedByBucket[bucket] = dailyFresh.length;
    inserted += dailyFresh.length;
    rows.push(...dailyFresh, ...known);
  }

  return { rows, inserted, updated: rows.length - inserted, insertedByBucket };
}
