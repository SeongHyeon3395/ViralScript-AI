import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const revalidate = 0;
export const dynamic = 'force-dynamic';

type TrendPlatform = 'TikTok' | 'YouTube Shorts';
type Region = 'US' | 'KR' | 'JP';
const TARGET_PER_REGION = 20;
const TARGET_PER_PLATFORM = 10;

const REGION_LANG: Record<Region, 'en' | 'ko' | 'ja'> = {
  US: 'en',
  KR: 'ko',
  JP: 'ja',
};

const REGION_YT_QUERIES: Record<Region, string[]> = {
  US: ['shorts trending', 'viral shorts', 'youtube shorts', 'popular shorts'],
  KR: ['한국 쇼츠', '인기 쇼츠', '오늘의 쇼츠', '먹방 쇼츠', '댄스 쇼츠', '꿀팁 쇼츠', '유머 쇼츠'],
  JP: ['日本 ショート', '人気ショート', '今日のショート', '料理 ショート', 'ダンス ショート', '便利 ショート', '面白い ショート'],
};

const REGION_TIKTOK_HASHTAGS: Record<Region, string[]> = {
  US: ['fyp', 'viral', 'trending', 'shorts'],
  KR: ['추천', '인기', '한국', '틱톡', '쇼츠', '유행'],
  JP: ['おすすめ', '人気', '日本', 'トレンド', 'ショート', '話題'],
};

interface TrendRow {
  platform: TrendPlatform;
  region: Region;
  title: string;
  subtitle: string;
  views: string;
  likes: string;
  tags: string;
  url: string;
  video_url: string;
}

interface ApifyItem {
  id?: string | number;
  url?: string;
  webVideoUrl?: string;
  permalink?: string;
  postUrl?: string;
  playCount?: number | string;
  viewCount?: number | string;
  views?: number | string;
  videoPlayCount?: number | string;
  diggCount?: number | string;
  likeCount?: number | string;
  likes?: number | string;
  caption?: string;
  title?: string;
  description?: string;
  text?: string;
  username?: string;
  authorMeta?: { name?: string; nickName?: string; uniqueId?: string };
  author?: { uniqueId?: string; username?: string };
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
  const value = text.trim();
  if (!value) return false;
  if (region === 'KR') return /[가-힣]/.test(value);
  if (region === 'JP') return /[\u3040-\u30ff\u4e00-\u9faf]/.test(value);

  const latin = (value.match(/[A-Za-z]/g) ?? []).length;
  const hangul = (value.match(/[가-힣]/g) ?? []).length;
  const japanese = (value.match(/[\u3040-\u30ff\u4e00-\u9faf]/g) ?? []).length;
  return latin >= 3 && hangul === 0 && japanese === 0;
}

function isKidsContent(text: string): boolean {
  return /\b(kids?|children|child|nursery|baby|toddler|preschool|cartoon|animation|toy|toys|cocomelon|minecraft kids)\b|어린이|아동|키즈|유아|동요|장난감|만화|애니메이션|子供|こども|キッズ|幼児|童謡|おもちゃ|アニメ/i.test(text);
}

function regionSubtitle(region: Region, views: number): string {
  if (region === 'KR') return `${formatCount(views)} 조회수 · 검증된 원본 링크`;
  if (region === 'JP') return `${formatCount(views)} 回再生 · 検証済みリンク`;
  return `${formatCount(views)} views · verified permalink`;
}

function validPermalink(platform: TrendPlatform, url: string): boolean {
  return platform === 'YouTube Shorts' ? DIRECT_URLS.youtube.test(url)
    : DIRECT_URLS.tiktok.test(url);
}

function buildRow(platform: TrendPlatform, region: Region, item: ApifyItem, videoUrl: string): TrendRow | null {
  if (!validPermalink(platform, videoUrl)) return null;
  const views = finiteNumber(item.playCount ?? item.viewCount ?? item.videoPlayCount ?? item.views);
  const likes = finiteNumber(item.diggCount ?? item.likeCount ?? item.likes);
  if (views <= 0) return null;
  const title = cleanText(item.title ?? item.caption ?? item.description ?? item.text, `${platform} viral short`);
  if (isKidsContent(title) || !matchesRegionLanguage(region, title)) return null;
  return {
    platform,
    region,
    title,
    subtitle: regionSubtitle(region, views),
    views: formatCount(views),
    likes: formatCount(likes),
    tags: '',
    url: videoUrl,
    video_url: videoUrl,
  };
}

async function collectYouTube(region: Region): Promise<TrendRow[]> {
  const key = process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_DATA_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not configured');
  const idSet = new Set<string>();
  for (const order of ['date'] as const) {
    for (const query of REGION_YT_QUERIES[region]) {
      try {
        let pageToken: string | undefined;
        for (let page = 0; page < 1; page += 1) {
        const search = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key,
            part: 'snippet',
            q: `${query} -kids -children -nursery -cartoon -toy`,
            type: 'video',
            videoDuration: 'short',
            order,
            regionCode: region,
            relevanceLanguage: REGION_LANG[region],
            maxResults: 50,
            ...(pageToken ? { pageToken } : {}),
          },
          timeout: 15_000,
        });
        const ids = (search.data.items ?? []).map((item: { id?: { videoId?: string } }) => item.id?.videoId).filter(Boolean) as string[];
        for (const id of ids) idSet.add(id);
        pageToken = search.data.nextPageToken;
        if (!pageToken) break;
        }
      } catch (error) {
        console.error('[cron/trend] YouTube query failed', { region, query, order, error: error instanceof Error ? error.message : error });
      }
    }
  }
  const ids = Array.from(idSet).slice(0, TARGET_PER_PLATFORM);
  if (!ids.length) throw new Error(`${region}: YouTube returned no videos`);
  const details = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: { key, part: 'snippet,statistics', id: ids.join(',') }, timeout: 15_000,
  });
  const rows = (details.data.items ?? []).map((item: { id: string; snippet?: { title?: string; description?: string }; statistics?: { viewCount?: string; likeCount?: string } }) => {
    const videoUrl = `https://www.youtube.com/shorts/${item.id}`;
    const views = finiteNumber(item.statistics?.viewCount);
    return {
      platform: 'YouTube Shorts' as const, region, title: cleanText(item.snippet?.title, 'YouTube Short'),
      sourceText: `${item.snippet?.title ?? ''} ${item.snippet?.description ?? ''}`,
      subtitle: regionSubtitle(region, views), views: formatCount(views),
      likes: formatCount(finiteNumber(item.statistics?.likeCount)), tags: '', url: videoUrl, video_url: videoUrl,
    };
  }).filter((row: TrendRow & { sourceText?: string }) => validPermalink(row.platform, row.video_url)
    && !isKidsContent(row.sourceText ?? row.title)
    && matchesRegionLanguage(region, row.title));
  return rows.slice(0, TARGET_PER_PLATFORM);
}

async function collectTikTok(region: Region): Promise<TrendRow[]> {
  const token = process.env.APIFY_API_TOKEN;
  const actor = process.env.APIFY_TREND_TIKTOK_ACTOR_ID ?? 'clockworks~tiktok-scraper';
  if (!token || !actor) throw new Error('Apify trend configuration missing for TikTok');
  let input: Record<string, unknown> = {
    hashtags: REGION_TIKTOK_HASHTAGS[region],
    resultsPerPage: 50,
    maxItems: 120,
    shouldDownloadVideos: false,
    countryCode: region,
  };
  const inputJson = process.env.APIFY_TREND_TIKTOK_INPUT_JSON;
  if (inputJson) input = JSON.parse(inputJson) as Record<string, unknown>;
  const response = await axios.post(`https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`, input, { timeout: 45_000 });
  return (response.data ?? []).map((item: ApifyItem): TrendRow | null => {
    let videoUrl = item.webVideoUrl ?? item.permalink ?? item.postUrl ?? item.url ?? '';
    const username = item.username ?? item.authorMeta?.uniqueId ?? item.author?.uniqueId ?? item.author?.username;
    if (!videoUrl && username && item.id) {
      videoUrl = `https://www.tiktok.com/@${username}/video/${item.id}`;
    }
    return buildRow('TikTok', region, item, videoUrl);
  }).filter((row: TrendRow | null): row is TrendRow => row !== null).slice(0, TARGET_PER_PLATFORM);
}

function composeRegionRows(region: Region, youtubeRows: TrendRow[], tiktokRows: TrendRow[]): TrendRow[] {
  const selected = [...youtubeRows.slice(0, TARGET_PER_PLATFORM), ...tiktokRows.slice(0, TARGET_PER_PLATFORM)];
  return selected.length === TARGET_PER_REGION ? selected : [];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const regions: Region[] = ['US', 'KR', 'JP'];
    const settled = await Promise.allSettled(
      regions.map(async (region) => {
        const [youtubeResult, tiktokResult] = await Promise.allSettled([
          collectYouTube(region),
          collectTikTok(region),
        ]);
        const youtubeRows = youtubeResult.status === 'fulfilled' ? youtubeResult.value : [];
        const tiktokRows = tiktokResult.status === 'fulfilled' ? tiktokResult.value : [];
        if (youtubeResult.status === 'rejected') {
          console.error('[cron/trend] YouTube source failed', { region, error: youtubeResult.reason instanceof Error ? youtubeResult.reason.message : youtubeResult.reason });
        }
        if (tiktokResult.status === 'rejected') {
          console.error('[cron/trend] TikTok source failed', { region, error: tiktokResult.reason instanceof Error ? tiktokResult.reason.message : tiktokResult.reason });
        }
        const regionRows = composeRegionRows(region, youtubeRows, tiktokRows);
        if (regionRows.length < TARGET_PER_REGION) {
          throw new Error(`${region}: collected ${regionRows.length}/${TARGET_PER_REGION} localized trends`);
        }
        return regionRows;
      }),
    );
    const collected = settled.flatMap((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      console.error('[cron/trend] source failed', { region: regions[index], error: result.reason instanceof Error ? result.reason.message : result.reason });
      return [];
    });
    const uniqueUrls = new Set<string>();
    const rows = collected.filter((row) => {
      if (!validPermalink(row.platform, row.video_url) || uniqueUrls.has(row.video_url)) return false;
      uniqueUrls.add(row.video_url);
      return true;
    });
    if (rows.length < TARGET_PER_REGION * regions.length) {
      throw new Error(`Insufficient localized trends: ${rows.length}/${TARGET_PER_REGION * regions.length}`);
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { error: deleteErr } = await supabase.from('trend_feed').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteErr) throw new Error(`DB delete failed: ${deleteErr.message}`);
    const { error: insertErr } = await supabase.from('trend_feed').insert(rows);
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);
    return NextResponse.json({ ok: true, count: rows.length, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[cron/trend]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> { return POST(req); }
