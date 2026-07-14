import axios, { AxiosError } from 'axios';
import type { ScrapedMetadata, SupportedPlatform } from '@/types';
import { ERROR_CODES } from '@/types';

const APIFY_BASE_URL = 'https://api.apify.com/v2/acts';
const SCRAPER_TIMEOUT_MS = 25_000;
const RETRY_TIMEOUT_MS = 30_000;

// 플랫폼별 Apify Actor ID 매핑
const ACTOR_IDS: Record<SupportedPlatform, string> = {
  tiktok: 'clockworks~tiktok-scraper',
  youtube: 'streamers~youtube-scraper',
  instagram: 'apify~instagram-scraper',
};

// 바이너리 다운로드 방지 필드 (Zero-Storage 원칙)
const BASE_SCRAPE_OPTIONS = {
  resultsPerPage: 1,
  shouldDownloadVideos: false,
  shouldDownloadCovers: false,
  shouldDownloadSubtitles: false,
  extractSubtitles: true,
  maxItems: 1,
};

interface ApifyRawItem {
  duration?: string | number;
  subtitles?: Array<{ text: string; start?: number }>;
  text?: string;
  title?: string;
  description?: string;
  authorMeta?: { region?: string };
  playCount?: string | number;
  diggCount?: string | number;
  videoMeta?: { duration?: number };
}

function extractTranscript(item: ApifyRawItem): string {
  if (item.subtitles && Array.isArray(item.subtitles) && item.subtitles.length > 0) {
    return item.subtitles
      .map((s) => s.text)
      .join(' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  const fallback = [item.title, item.description, item.text]
    .filter(Boolean)
    .join(' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  if (fallback.length >= 5) return fallback;

  // 자막 완전 실패 시 — 시각 메타데이터 기반으로 AI가 구조 추론
  return 'No explicit transcript available. Relying on visual metadata pacing and engagement signals.';
}

async function callApifyActor(
  actorId: string,
  normalizedUrl: string,
  apifyToken: string,
  timeoutMs: number
): Promise<ApifyRawItem> {
  const endpoint = `${APIFY_BASE_URL}/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${apifyToken}`;

  const response = await axios.post<ApifyRawItem[]>(
    endpoint,
    {
      ...BASE_SCRAPE_OPTIONS,
      startUrls: [{ url: normalizedUrl }],
    },
    {
      timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data = response.data?.[0];
  if (!data) {
    throw new Error(ERROR_CODES.URL_PRIVATE_OR_DELETED);
  }

  return data;
}

/**
 * 외부 Apify 미들웨어를 통해 영상 메타데이터 및 자막 텍스트를 수집합니다.
 * 원본 바이너리(MP4, MP3)는 절대 다운로드하지 않습니다.
 * BYOK 모드 지원: customToken이 있으면 서버 토큰 대신 사용합니다.
 */
export async function fetchVideoMetadata(
  normalizedUrl: string,
  platform: SupportedPlatform,
  customApifyToken?: string
): Promise<ScrapedMetadata> {
  const apifyToken = customApifyToken ?? process.env.APIFY_API_TOKEN;

  if (!apifyToken) {
    throw new Error('APIFY_API_TOKEN is not configured');
  }

  const actorId = ACTOR_IDS[platform];

  let item: ApifyRawItem;

  try {
    item = await callApifyActor(actorId, normalizedUrl, apifyToken, SCRAPER_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof Error && err.message === ERROR_CODES.URL_PRIVATE_OR_DELETED) {
      throw err;
    }

    const axiosErr = err as AxiosError;
    if (axiosErr.response?.status === 404 || axiosErr.response?.status === 403) {
      throw new Error(ERROR_CODES.URL_PRIVATE_OR_DELETED);
    }

    // 타임아웃 시 1회 재시도
    if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
      try {
        item = await callApifyActor(actorId, normalizedUrl, apifyToken, RETRY_TIMEOUT_MS);
      } catch {
        throw new Error(ERROR_CODES.SCRAPER_TIMEOUT);
      }
    } else {
      console.error('[ScraperMiddleware] Unexpected error:', axiosErr.message);
      throw new Error(ERROR_CODES.MIDDLEWARE_SCRAPING_FAILED);
    }
  }

  const durationRaw =
    item.videoMeta?.duration ?? item.duration;
  const durationSeconds = typeof durationRaw === 'number'
    ? durationRaw
    : parseInt(String(durationRaw ?? '30'), 10) || 30;

  return {
    durationSeconds,
    transcriptText: extractTranscript(item),
    creatorCountry: item.authorMeta?.region ?? 'US',
    engagementMetrics: {
      views: parseInt(String(item.playCount ?? '10000'), 10) || 10000,
      likes: parseInt(String(item.diggCount ?? '1000'), 10) || 1000,
    },
  };
}
