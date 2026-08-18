import { createHash } from 'crypto';
import type { NormalizedUrlResult } from '@/types';
import { ERROR_CODES } from '@/types';

function result(platform: NormalizedUrlResult['platform'], normalizedUrl: string): NormalizedUrlResult {
  return {
    platform,
    normalizedUrl,
    urlHash: createHash('sha256').update(normalizedUrl).digest('hex'),
  };
}

export function normalizeAndValidateUrl(rawUrl: string): NormalizedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { throw new Error(ERROR_CODES.INVALID_URL_FORMAT); }
  if (url.protocol !== 'https:') throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
  const hostname = url.hostname.toLowerCase();

  if (hostname === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
    return result('youtube', `https://www.youtube.com/shorts/${id}`);
  }
  if (hostname === 'youtube.com' || hostname === 'www.youtube.com') {
    const match = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})\/?$/i);
    if (!match) throw new Error(ERROR_CODES.NOT_A_YOUTUBE_SHORTS_URL);
    return result('youtube', `https://www.youtube.com/shorts/${match[1]}`);
  }

  if (hostname === 'www.tiktok.com' || hostname === 'tiktok.com') {
    const match = url.pathname.match(/^\/@([^/\s]+)\/video\/(\d+)\/?$/i);
    if (!match) throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
    return result('tiktok', `https://www.tiktok.com/@${match[1]}/video/${match[2]}`);
  }
  if (hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
    const code = url.pathname.match(/^\/([A-Za-z0-9_-]+)\/?$/)?.[1];
    if (!code) throw new Error(ERROR_CODES.INVALID_URL_FORMAT);
    return result('tiktok', `https://${hostname}/${code}`);
  }

  throw new Error(ERROR_CODES.UNSUPPORTED_PLATFORM);
}
