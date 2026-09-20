import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { fetchVideoMetadata } from '@/services/scraperMiddleware';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('reference evidence', () => {
  beforeEach(() => vi.resetAllMocks());

  it('does not invent duration, country, or engagement from an oEmbed title', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { title: 'A public video title' } });
    const metadata = await fetchVideoMetadata('https://www.youtube.com/shorts/example', 'youtube');
    expect(metadata).toEqual({ durationSeconds: 0, transcriptText: 'A public video title', sourceEvidence: 'title_only', creatorCountry: undefined });
  });

  it('preserves real zero counts but leaves absent counts unknown', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: [{ title: 'Sample', description: 'Public description', playCount: 0 }] });
    const metadata = await fetchVideoMetadata('https://www.youtube.com/shorts/example', 'youtube', 'test-token');
    expect(metadata.sourceEvidence).toBe('description');
    expect(metadata.durationSeconds).toBe(0);
    expect(metadata.engagementMetrics).toEqual({ views: 0, likes: undefined });
  });

  it('marks actual subtitle text separately from title or description', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: [{ title: 'Sample', subtitles: [{ text: 'Real caption text' }], duration: 21, playCount: '1,234', diggCount: 0 }] });
    const metadata = await fetchVideoMetadata('https://www.youtube.com/shorts/example', 'youtube', 'test-token');
    expect(metadata.sourceEvidence).toBe('subtitles');
    expect(metadata.transcriptText).toBe('Real caption text');
    expect(metadata.durationSeconds).toBe(21);
    expect(metadata.engagementMetrics).toEqual({ views: 1234, likes: 0 });
  });
});
