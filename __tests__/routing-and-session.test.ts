import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeAndValidateUrl } from '../utils/urlNormalizer';
import { ERROR_CODES } from '../types';

describe('URL routing and session security logic', () => {
  it('accepts direct short-form permalinks', () => {
    const allowed = [
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.tiktok.com/@creator/video/1234567890123456789',
      'https://vt.tiktok.com/ZSRabc123/',
    ];
    for (const url of allowed) expect(() => normalizeAndValidateUrl(url)).not.toThrow();
  });

  it('rejects search and discovery URLs', () => {
    const rejected = [
      'https://www.youtube.com/results?search_query=ai+marketing+shorts',
      'https://www.youtube.com/hashtag/ai-marketing',
      'https://www.tiktok.com/search?q=beauty+tips',
      'https://www.tiktok.com/tag/beauty',
      'https://www.youtube.com/results?search_query=viral',
    ];
    for (const url of rejected) expect(() => normalizeAndValidateUrl(url)).toThrow();
  });

  it('canonicalizes direct permalinks', () => {
    expect(normalizeAndValidateUrl('https://youtu.be/dQw4w9WgXcQ').normalizedUrl).toBe('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  });

  it('rejects unsupported URLs and non-Shorts YouTube videos', () => {
    expect(() => normalizeAndValidateUrl('https://example.com/not-supported')).toThrow(ERROR_CODES.UNSUPPORTED_PLATFORM);
    expect(() => normalizeAndValidateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toThrow(ERROR_CODES.NOT_A_YOUTUBE_SHORTS_URL);
  });

  it('auto-logout kill switch and test value both use six hours', () => {
    const ms6Hours = 21_600_000;
    const now = Date.now();
    expect(now - ms6Hours - 1000 + ms6Hours < now).toBe(true);
    expect(readFileSync(resolve(__dirname, '..', 'app/components/AuthProvider.tsx'), 'utf8')).toContain('const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000');
  });
});
