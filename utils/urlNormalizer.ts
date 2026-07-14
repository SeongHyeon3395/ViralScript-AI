import { createHash } from 'crypto';
import type { NormalizedUrlResult, SupportedPlatform } from '@/types';
import { ERROR_CODES } from '@/types';

/**
 * 클라이언트에서 전송된 소셜 미디어 URL을 정규화하고,
 * 플랫폼을 판별하고, SHA-256 해시를 생성합니다.
 * 트래커 파라미터 및 세션 파라미터는 완전히 제거됩니다.
 */
export function normalizeAndValidateUrl(rawUrl: string): NormalizedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
  }

  let urlObj: URL;
  try {
    urlObj = new URL(rawUrl.trim());
  } catch {
    throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
  }

  // HTTPS만 허용 (보안: HTTP 다운그레이드 공격 방지)
  if (urlObj.protocol !== 'https:') {
    throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
  }

  let platform: SupportedPlatform;
  let cleanUrl = '';

  const hostname = urlObj.hostname.toLowerCase();

  // 1. TikTok 검증
  if (hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com')) {
    platform = 'tiktok';
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const videoIndex = pathParts.findIndex((p) => p === 'video');

    if (videoIndex !== -1 && pathParts[videoIndex + 1]) {
      // 숫자 ID 검증
      const videoId = pathParts[videoIndex + 1].split('?')[0];
      if (!/^\d+$/.test(videoId)) {
        throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
      }
      cleanUrl = `https://www.tiktok.com/video/${videoId}`;
    } else {
      // 단축 URL 형태 (vm.tiktok.com/...) — 미들웨어에서 리다이렉트 처리
      cleanUrl = `https://www.tiktok.com${urlObj.pathname}`;
    }
  }
  // 2. YouTube Shorts 검증
  else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    platform = 'youtube';
    if (urlObj.pathname.includes('/shorts/')) {
      const videoId = urlObj.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
      if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
        throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
      }
      cleanUrl = `https://www.youtube.com/shorts/${videoId}`;
    } else {
      throw new Error(ERROR_CODES.NOT_A_YOUTUBE_SHORTS_URL);
    }
  }
  // 3. Instagram Reels 검증
  else if (hostname.includes('instagram.com')) {
    platform = 'instagram';
    const reelMatch = urlObj.pathname.match(/\/reels?\/([A-Za-z0-9_-]+)/);
    if (reelMatch?.[1]) {
      cleanUrl = `https://www.instagram.com/reel/${reelMatch[1]}/`;
    } else {
      throw new Error(ERROR_CODES.NOT_AN_INSTAGRAM_REEL_URL);
    }
  } else {
    throw new Error(ERROR_CODES.UNSUPPORTED_PLATFORM);
  }

  const urlHash = createHash('sha256').update(cleanUrl).digest('hex');

  return { platform, normalizedUrl: cleanUrl, urlHash };
}
