import { describe, expect, it } from 'vitest';
import { selectDailyTrendRows } from '@/lib/trendSelection';

const candidate = (video: string, region = 'US') => ({
  platform: 'YouTube Shorts',
  region,
  video_url: `https://www.youtube.com/shorts/${video}`,
  title: video,
});

describe('daily trend selection', () => {
  it('selects new candidates after the existing URL lookup instead of repeatedly refreshing a top-ten slice', () => {
    const known = Array.from({ length: 10 }, (_, index) => candidate(`known${index.toString().padStart(6, '0')}`));
    const fresh = Array.from({ length: 12 }, (_, index) => candidate(`fresh${index.toString().padStart(6, '0')}`));
    const existing = new Set(known.map((row) => `${row.platform}|${row.video_url}`));

    const selection = selectDailyTrendRows([...known, ...fresh], existing, 10);

    expect(selection.inserted).toBe(10);
    expect(selection.updated).toBe(10);
    expect(selection.rows.filter((row) => row.title.startsWith('fresh'))).toHaveLength(10);
    expect(selection.insertedByBucket['YouTube Shorts|US']).toBe(10);
  });

  it('keeps known rows in the upsert batch so refreshed metadata is retained', () => {
    const known = candidate('known000001', 'KR');
    const existing = new Set([`${known.platform}|${known.video_url}`]);

    const selection = selectDailyTrendRows([known], existing, 10);

    expect(selection.rows).toEqual([known]);
    expect(selection.inserted).toBe(0);
    expect(selection.updated).toBe(1);
  });
});
