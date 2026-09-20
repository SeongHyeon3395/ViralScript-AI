import axios, { AxiosError } from 'axios';
import type { ScrapedMetadata, SupportedPlatform } from '@/types';
import { ERROR_CODES } from '@/types';

const APIFY_BASE_URL = 'https://api.apify.com/v2/acts';
const SCRAPER_TIMEOUT_MS = 55_000;
const RETRY_TIMEOUT_MS = 25_000;

// 플랫폼별 Apify Actor ID (현재 2026 동작 확인된 엑터)
const ACTOR_IDS: Record<SupportedPlatform, string> = {
  tiktok:    'clockworks~free-tiktok-scraper',
  youtube:   'h7sDV53CddomktSi5',                 // YouTube Video Scraper (Apify)
};

// 바이너리 다운로드 방지 (Zero-Storage 원칙)
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
  playCount?: string | number;
  diggCount?: string | number;
  videoMeta?: { duration?: number };
  authorMeta?: { region?: string; name?: string };
}

function extractSourceText(item: ApifyRawItem): Pick<ScrapedMetadata, 'transcriptText' | 'sourceEvidence'> {
  if (item.subtitles && Array.isArray(item.subtitles) && item.subtitles.length > 0) {
    const transcriptText = item.subtitles
      .map((s) => s.text)
      .join(' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    if (transcriptText) return { transcriptText, sourceEvidence: 'subtitles' };
  }

  const description = [item.description, item.text]
    .filter(Boolean)
    .join(' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (description) return { transcriptText: [item.title, description].filter(Boolean).join(' — '), sourceEvidence: 'description' };
  return { transcriptText: item.title?.trim() || 'No source text available.', sourceEvidence: 'title_only' };
}

function knownCount(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (!value) return undefined;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
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

async function fetchOEmbedMetadata(normalizedUrl: string, platform: SupportedPlatform): Promise<ApifyRawItem> {
  const endpoint = platform === 'youtube'
    ? `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`
    : `https://www.tiktok.com/oembed?url=${encodeURIComponent(normalizedUrl)}`;
  const response = await axios.get<{ title?: string; author_name?: string }>(endpoint, { timeout: 10_000 });
  if (!response.data?.title) throw new Error(ERROR_CODES.URL_PRIVATE_OR_DELETED);
  return { title: response.data.title, authorMeta: { name: response.data.author_name } };
}

/**
 * 외부 Apify 미들웨어를 통해 영상 메타데이터 및 자막 텍스트를 수집합니다.
 * 스크래핑 실패 시 반드시 에러를 throw합니다 — fallback 진행 없음.
 * 호출부(analyze route)에서 에러 시 크레딧을 차감하지 않습니다.
 */
export async function fetchVideoMetadata(
  normalizedUrl: string,
  platform: SupportedPlatform,
  customApifyToken?: string
): Promise<ScrapedMetadata> {
  const apifyToken = customApifyToken ?? process.env.APIFY_API_TOKEN;

  if (!apifyToken) {
    try {
      const item = await fetchOEmbedMetadata(normalizedUrl, platform);
      return {
        durationSeconds: 0,
        ...extractSourceText(item),
        creatorCountry: item.authorMeta?.region,
      };
    } catch {
      throw new Error(ERROR_CODES.MIDDLEWARE_SCRAPING_FAILED);
    }
  }

  const actorId = ACTOR_IDS[platform];
  let item: ApifyRawItem;

  try {
    item = await callApifyActor(actorId, normalizedUrl, apifyToken, SCRAPER_TIMEOUT_MS);
  } catch (err) {
    const axiosErr = err as AxiosError;

    if (axiosErr.response?.status === 403 || axiosErr.response?.status === 404 || (err instanceof Error && err.message === ERROR_CODES.URL_PRIVATE_OR_DELETED)) {
      try { item = await fetchOEmbedMetadata(normalizedUrl, platform); }
      catch { throw new Error(ERROR_CODES.URL_PRIVATE_OR_DELETED); }
    }

    // 타임아웃: 1회 재시도 후 실패 시 에러 throw
    else if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ETIMEDOUT') {
      try {
        item = await callApifyActor(actorId, normalizedUrl, apifyToken, RETRY_TIMEOUT_MS);
      } catch {
        try { item = await fetchOEmbedMetadata(normalizedUrl, platform); }
        catch { throw new Error(ERROR_CODES.SCRAPER_TIMEOUT); }
      }
    } else {
      console.error('[ScraperMiddleware] Actor error:', (err as Error).message);
      try { item = await fetchOEmbedMetadata(normalizedUrl, platform); }
      catch { throw new Error(ERROR_CODES.MIDDLEWARE_SCRAPING_FAILED); }
    }
  }

  const durationRaw = item.videoMeta?.duration ?? item.duration;
  const parsedDuration = typeof durationRaw === 'number' ? durationRaw : Number.parseInt(String(durationRaw ?? ''), 10);
  const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 0;
  const views = knownCount(item.playCount);
  const likes = knownCount(item.diggCount);

  return {
    durationSeconds,
    ...extractSourceText(item),
    creatorCountry: item.authorMeta?.region,
    engagementMetrics: views !== undefined || likes !== undefined ? { views, likes } : undefined,
  };
}
