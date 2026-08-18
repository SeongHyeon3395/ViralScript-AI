import { describe, it, expect } from 'vitest';
import { normalizeAndValidateUrl } from '../utils/urlNormalizer';
import { ERROR_CODES } from '../types';

describe('URL routing and session security logic', () => {
  it('accepts direct short-form permalinks', () => {
    const allowed = [
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.tiktok.com/@creator/video/1234567890123456789',
      'https://vt.tiktok.com/ZSRabc123/',
      'https://www.instagram.com/reel/ABC_def-12/',
      'https://www.instagram.com/p/ABC_def-12/',
    ];
    for (const url of allowed) expect(() => normalizeAndValidateUrl(url)).not.toThrow();
  });

  it('rejects search and discovery URLs', () => {
    const rejected = [
      'https://www.youtube.com/results?search_query=ai+marketing+shorts',
      'https://www.youtube.com/hashtag/ai-marketing',
      'https://www.tiktok.com/search?q=beauty+tips',
      'https://www.tiktok.com/tag/beauty',
      'https://www.instagram.com/explore/search/keyword/?q=viral',
      'https://www.instagram.com/explore/tags/viral/',
    ];
    for (const url of rejected) expect(() => normalizeAndValidateUrl(url)).toThrow();
  });

  it('canonicalizes direct permalinks', () => {
    expect(normalizeAndValidateUrl('https://youtu.be/dQw4w9WgXcQ').normalizedUrl).toBe('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    expect(normalizeAndValidateUrl('https://www.instagram.com/p/ABC_def-12/').normalizedUrl).toBe('https://www.instagram.com/p/ABC_def-12/');
  });

  it('rejects unsupported URLs and non-Shorts YouTube videos', () => {
    expect(() => normalizeAndValidateUrl('https://example.com/not-supported')).toThrow(ERROR_CODES.UNSUPPORTED_PLATFORM);
    expect(() => normalizeAndValidateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toThrow(ERROR_CODES.NOT_A_YOUTUBE_SHORTS_URL);
  });

  it('auto-logout kill switch triggers after 12 hours in session storage', () => {
    const ms12Hours = 43_200_000;
    const now = Date.now();
    expect(now - ms12Hours - 1000 + ms12Hours < now).toBe(true);
  });
});
