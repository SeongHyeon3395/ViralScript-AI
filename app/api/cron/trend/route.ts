import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { selectDailyTrendRows } from '@/lib/trendSelection';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const revalidate = 0;
export const dynamic = 'force-dynamic';

type TrendPlatform = 'TikTok' | 'YouTube Shorts';
type Region = 'US' | 'KR' | 'JP';
const DAILY_NEW_TARGET = 10;
const CANDIDATES_PER_PLATFORM = 50;

const REGION_LANG: Record<Region, 'en' | 'ko' | 'ja'> = { US: 'en', KR: 'ko', JP: 'ja' };
const REGION_YT_QUERIES: Record<Region, string[]> = {
  US: ['trending shorts', 'viral shorts', 'popular shorts'],
  KR: ['한국 쇼츠', '인기 쇼츠', '오늘의 쇼츠', '유행 쇼츠'],
  JP: ['日本 ショート', '人気 ショート', '話題 ショート', 'バズ ショート'],
};
const REGION_TIKTOK_HASHTAGS: Record<Region, string[]> = {
  US: ['fyp', 'viral', 'trending', 'shorts'],
  KR: ['추천', '인기', '한국', '쇼츠', '유행'],
  JP: ['おすすめ', '人気', '日本', 'バズ', 'ショート'],
};

interface TrendRow {
  platform: TrendPlatform; region: Region; title: string; subtitle: string;
  views: string; likes: string; tags: string; thumb_url: string | null;
  url: string; video_url: string;
}

interface ApifyItem {
  id?: string | number; url?: string; webVideoUrl?: string; permalink?: string; postUrl?: string;
  playCount?: number | string; viewCount?: number | string; views?: number | string; videoPlayCount?: number | string;
  diggCount?: number | string; likeCount?: number | string; likes?: number | string;
  caption?: string; title?: string; description?: string; text?: string; username?: string;
  cover?: string; coverUrl?: string; videoMeta?: { coverUrl?: string };
  authorMeta?: { uniqueId?: string }; author?: { uniqueId?: string; username?: string };
}

const DIRECT_URLS = {
  youtube: /^https:\/\/(?:www\.)?youtube\.com\/shorts\/[A-Za-z0-9_-]{11}(?:[/?#].*)?$/i,
  tiktok: /^https:\/\/www\.tiktok\.com\/@[^/\s]+\/video\/\d+(?:[/?#].*)?$/i,
};

function finiteNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return String(value);
}

function cleanText(value: unknown, fallback: string): string {
  const text = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  return text || fallback;
}

function matchesRegionLanguage(region: Region, text: string): boolean {
  if (!text.trim()) return false;
  if (region === 'KR') return /[\uac00-\ud7a3]/.test(text);
  if (region === 'JP') return /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
  return /[A-Za-z]{3}/.test(text) && !/[\uac00-\ud7a3\u3040-\u30ff]/.test(text);
}

function isKidsContent(text: string): boolean {
  return /\b(kids?|children|child|nursery|baby|toddler|preschool|cartoon|animation|toy|toys|cocomelon|minecraft kids)\b/i.test(text)
    || /키즈|어린이|유아|동요|장난감|アニメ|子供|おもちゃ/.test(text);
}

function regionSubtitle(region: Region, views: number): string {
  const count = formatCount(views);
  if (region === 'KR') return `${count} 조회 · 최신 수집 영상`;
  if (region === 'JP') return `${count} 回再生 · 最新トレンド`;
  return `${count} views · latest trend`;
}

function validPermalink(platform: TrendPlatform, url: string): boolean {
  return platform === 'YouTube Shorts' ? DIRECT_URLS.youtube.test(url) : DIRECT_URLS.tiktok.test(url);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown source error';
}

function buildRow(platform: TrendPlatform, region: Region, item: ApifyItem, videoUrl: string): TrendRow | null {
  if (!validPermalink(platform, videoUrl)) return null;
  const views = finiteNumber(item.playCount ?? item.viewCount ?? item.videoPlayCount ?? item.views);
  if (views <= 0) return null;
  const title = cleanText(item.title ?? item.caption ?? item.description ?? item.text, `${platform} viral short`);
  if (isKidsContent(title) || !matchesRegionLanguage(region, title)) return null;
  const thumbUrl = item.cover ?? item.coverUrl ?? item.videoMeta?.coverUrl ?? null;
  if (!thumbUrl?.trim()) return null;
  return {
    platform, region, title, subtitle: regionSubtitle(region, views), views: formatCount(views),
    likes: formatCount(finiteNumber(item.diggCount ?? item.likeCount ?? item.likes)), tags: '',
    thumb_url: thumbUrl,
    url: videoUrl, video_url: videoUrl,
  };
}

async function collectYouTube(region: Region): Promise<TrendRow[]> {
  const key = process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_DATA_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not configured');
  const ids = new Set<string>();
  const searches = await Promise.allSettled(REGION_YT_QUERIES[region].map((query) => axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: { key, part: 'snippet', q: `${query} -kids -children -nursery -cartoon -toy`, type: 'video', videoDuration: 'short', order: 'relevance', regionCode: region, relevanceLanguage: REGION_LANG[region], maxResults: 25 },
    timeout: 12_000,
  })));
  for (const [index, result] of searches.entries()) {
    if (result.status === 'fulfilled') {
      for (const item of result.value.data.items ?? []) if (item.id?.videoId) ids.add(item.id.videoId);
    } else {
      console.error('[cron/trend] YouTube query failed', { region, query: REGION_YT_QUERIES[region][index], error: errorMessage(result.reason) });
    }
  }
  if (!ids.size) throw new Error(`${region}: YouTube returned no videos`);
  const details = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: { key, part: 'snippet,statistics', id: Array.from(ids).slice(0, 50).join(',') }, timeout: 15_000,
  });
  return (details.data.items ?? []).map((item: { id: string; snippet?: { title?: string; description?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } }; statistics?: { viewCount?: string; likeCount?: string } }) => {
    const videoUrl = `https://www.youtube.com/shorts/${item.id}`;
    const views = finiteNumber(item.statistics?.viewCount);
    return { platform: 'YouTube Shorts' as const, region, title: cleanText(item.snippet?.title, 'YouTube Short'), sourceText: `${item.snippet?.title ?? ''} ${item.snippet?.description ?? ''}`, subtitle: regionSubtitle(region, views), views: formatCount(views), likes: formatCount(finiteNumber(item.statistics?.likeCount)), tags: '', thumb_url: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? null, url: videoUrl, video_url: videoUrl };
  }).filter((row: TrendRow & { sourceText?: string }) => validPermalink(row.platform, row.video_url) && !!row.thumb_url?.trim() && !isKidsContent(row.sourceText ?? row.title) && matchesRegionLanguage(region, row.title)).map((row: TrendRow & { sourceText?: string }) => {
    const { sourceText, ...dbRow } = row;
    void sourceText;
    return dbRow;
  }).slice(0, CANDIDATES_PER_PLATFORM);
}

async function collectTikTok(region: Region): Promise<TrendRow[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is not configured for TikTok');
  const regionInput: Record<string, unknown> = { hashtags: REGION_TIKTOK_HASHTAGS[region], resultsPerPage: 50, maxItems: 120, shouldDownloadVideos: false, countryCode: region };
  const configuredInput = process.env.APIFY_TREND_TIKTOK_INPUT_JSON
    ? JSON.parse(process.env.APIFY_TREND_TIKTOK_INPUT_JSON) as Record<string, unknown>
    : {};
  // Keep actor-specific settings, but never let a global env object erase the
  // region-specific country and hashtags for every daily bucket.
  const input = { ...configuredInput, ...regionInput };
  const response = await axios.post(`https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`, input, { timeout: 45_000 });
  return (response.data ?? []).map((item: ApifyItem) => {
    let videoUrl = item.webVideoUrl ?? item.permalink ?? item.postUrl ?? item.url ?? '';
    const username = item.username ?? item.authorMeta?.uniqueId ?? item.author?.uniqueId ?? item.author?.username;
    if (!videoUrl && username && item.id) videoUrl = `https://www.tiktok.com/@${username}/video/${item.id}`;
    return buildRow('TikTok', region, item, videoUrl);
  }).filter((row: TrendRow | null): row is TrendRow => row !== null).slice(0, CANDIDATES_PER_PLATFORM);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ ok: false, error: 'Trend database configuration is missing' }, { status: 500 });
    const regions: Region[] = ['US', 'KR', 'JP'];
    const sourceErrors: Array<{ region: Region; source: TrendPlatform; error: string }> = [];
    const settled = await Promise.allSettled(regions.map(async (region) => {
      const [youtubeResult, tiktokResult] = await Promise.allSettled([collectYouTube(region), collectTikTok(region)]);
      if (youtubeResult.status === 'rejected') {
        const error = errorMessage(youtubeResult.reason);
        sourceErrors.push({ region, source: 'YouTube Shorts', error });
        console.error('[cron/trend] YouTube source failed', { region, error });
      }
      if (tiktokResult.status === 'rejected') {
        const error = errorMessage(tiktokResult.reason);
        sourceErrors.push({ region, source: 'TikTok', error });
        console.error('[cron/trend] TikTok source failed', { region, error });
      }
      return [...(youtubeResult.status === 'fulfilled' ? youtubeResult.value : []), ...(tiktokResult.status === 'fulfilled' ? tiktokResult.value : [])];
    }));
    const collected = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    const uniqueUrls = new Set<string>();
    const candidates = collected.filter((row) => validPermalink(row.platform, row.video_url) && !uniqueUrls.has(row.video_url) && uniqueUrls.add(row.video_url));
    if (!candidates.length) return NextResponse.json({ ok: false, inserted: 0, updated: 0, collected: 0, sourceErrors }, { status: 503 });

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const candidateUrls = [...new Set(candidates.map((row) => row.video_url))];
    const { data: existingRows, error: existingErr } = await supabase.from('trend_feed').select('platform, video_url').in('video_url', candidateUrls);
    if (existingErr) throw new Error(`Existing trend lookup failed: ${existingErr.message}`);
    const existingKeys = new Set((existingRows ?? []).map((row) => `${row.platform}|${row.video_url}`));
    const selection = selectDailyTrendRows(candidates, existingKeys, DAILY_NEW_TARGET);
    if (!selection.rows.length) return NextResponse.json({ ok: false, inserted: 0, updated: 0, collected: candidates.length, sourceErrors }, { status: 503 });
    const collectedAt = new Date().toISOString();
    const { error: upsertError } = await supabase.from('trend_feed').upsert(
      selection.rows.map((row) => ({ ...row, updated_at: collectedAt })),
      { onConflict: 'platform,video_url' },
    );
    if (upsertError) throw new Error(`DB upsert failed: ${upsertError.message}`);
    return NextResponse.json({ ok: true, inserted: selection.inserted, updated: selection.updated, collected: candidates.length, insertedByBucket: selection.insertedByBucket, sourceErrors, updatedAt: collectedAt });
  } catch (error) {
    console.error('[cron/trend]', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> { return POST(req); }
