import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const revalidate = 0;
export const dynamic = 'force-dynamic';

type TrendPlatform = 'TikTok' | 'YouTube Shorts';
type Region = 'US' | 'KR' | 'JP';

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

function validPermalink(platform: TrendPlatform, url: string): boolean {
  return platform === 'YouTube Shorts' ? DIRECT_URLS.youtube.test(url)
    : DIRECT_URLS.tiktok.test(url);
}

function buildRow(platform: TrendPlatform, region: Region, item: ApifyItem, videoUrl: string): TrendRow | null {
  if (!validPermalink(platform, videoUrl)) return null;
  const views = finiteNumber(item.playCount ?? item.viewCount ?? item.videoPlayCount ?? item.views);
  const likes = finiteNumber(item.diggCount ?? item.likeCount ?? item.likes);
  if (views <= 0) return null;
  return {
    platform,
    region,
    title: cleanText(item.title ?? item.caption ?? item.description ?? item.text, `${platform} viral short`),
    subtitle: `${formatCount(views)} views · verified public permalink`,
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
  const search = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: { key, part: 'snippet', q: '#shorts', type: 'video', videoDuration: 'short', order: 'viewCount', regionCode: region, maxResults: 10 },
    timeout: 15_000,
  });
  const ids = (search.data.items ?? []).map((item: { id?: { videoId?: string } }) => item.id?.videoId).filter(Boolean) as string[];
  if (!ids.length) throw new Error(`${region}: YouTube returned no videos`);
  const details = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: { key, part: 'snippet,statistics', id: ids.join(',') }, timeout: 15_000,
  });
  return (details.data.items ?? []).map((item: { id: string; snippet?: { title?: string }; statistics?: { viewCount?: string; likeCount?: string } }) => {
    const videoUrl = `https://www.youtube.com/shorts/${item.id}`;
    const views = finiteNumber(item.statistics?.viewCount);
    return {
      platform: 'YouTube Shorts' as const, region, title: cleanText(item.snippet?.title, 'YouTube Short'),
      subtitle: `${formatCount(views)} views · YouTube Data API`, views: formatCount(views),
      likes: formatCount(finiteNumber(item.statistics?.likeCount)), tags: '', url: videoUrl, video_url: videoUrl,
    };
  }).filter((row: TrendRow) => validPermalink(row.platform, row.video_url));
}

async function collectTikTok(region: Region): Promise<TrendRow[]> {
  const token = process.env.APIFY_API_TOKEN;
  const actor = process.env.APIFY_TREND_TIKTOK_ACTOR_ID ?? 'clockworks~tiktok-scraper';
  if (!token || !actor) throw new Error('Apify trend configuration missing for TikTok');
  let input: Record<string, unknown> = { hashtags: ['fyp', 'viral', 'trending'], resultsPerPage: 10, maxItems: 10, shouldDownloadVideos: false };
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
  }).filter((row: TrendRow | null): row is TrendRow => row !== null).slice(0, 10);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const regions: Region[] = ['US', 'KR', 'JP'];
    const jobs = regions.flatMap((region) => [
      collectYouTube(region), collectTikTok(region),
    ]);
    const settled = await Promise.allSettled(jobs);
    const collected = settled.flatMap((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      console.error('[cron/trend] source failed', { job: index, error: result.reason instanceof Error ? result.reason.message : result.reason });
      return [];
    });
    const uniqueUrls = new Set<string>();
    const rows = collected.filter((row) => {
      if (!validPermalink(row.platform, row.video_url) || uniqueUrls.has(row.video_url)) return false;
      uniqueUrls.add(row.video_url);
      return true;
    });
    if (!rows.length) throw new Error('No verified trend permalinks collected');
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
