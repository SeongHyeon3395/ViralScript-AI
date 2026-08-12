import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 10;
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// ─── 검색 URL 폴백 생성기 ─────────────────────────────────────────
function buildSearchUrl(platform: string, title: string): string {
  const q = encodeURIComponent(title);
  if (platform === 'TikTok') return `https://www.tiktok.com/search?q=${q}`;
  if (platform === 'YouTube Shorts') return `https://www.youtube.com/results?search_query=${q}&sp=EgIYAg%3D%3D`;
  // Instagram Reels
  return `https://www.instagram.com/explore/tags/${encodeURIComponent(title.replace(/\s+/g, '').replace(/^#/, ''))}`;
}

// ─── AI 스키마 ────────────────────────────────────────────────────
const trendItemSchema = {
  type: 'object' as const,
  properties: {
    trends: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          platform: { type: 'string' as const, enum: ['TikTok', 'YouTube Shorts', 'Instagram Reels'] },
          region:   { type: 'string' as const, enum: ['US', 'KR', 'JP'] },
          title:    { type: 'string' as const },
          subtitle: { type: 'string' as const },
          views:    { type: 'string' as const },
          likes:    { type: 'string' as const },
          tags:     { type: 'string' as const },
        },
        required: ['platform', 'region', 'title', 'subtitle', 'views', 'likes', 'tags'],
      },
    },
  },
  required: ['trends'],
};

const SYSTEM_PROMPT = `You are a 2026 Global Short-Form Trend Analyst. Today is ${new Date().toISOString().slice(0, 10)}.

Generate exactly 90 trending short-form video items:
- 30 items for US, 30 for KR, 30 for JP
- Within each region: 10 TikTok, 10 YouTube Shorts, 10 Instagram Reels

For EVERY item provide:
- platform: "TikTok" | "YouTube Shorts" | "Instagram Reels"
- region: "US" | "KR" | "JP"
- title: compelling headline in the region's native language
- subtitle: one sentence explaining why it's viral (native language)
- views: e.g. "3.2M"
- likes: e.g. "450K"
- tags: 2-3 hashtags, comma-separated, native language
Do not generate video URLs. The server creates a platform search URL from each title.

Topics must span: AI tools, K-pop/J-pop, food hacks, comedy, ASMR, beauty/fashion, dance challenges, tech productivity.
Return ONLY valid JSON. No markdown.`;

// ─── POST /api/cron/trend ─────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not configured');

    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 8_000 } });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: trendItemSchema,
        temperature: 0.8,
        maxOutputTokens: 9000,
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error('AI returned empty response');

    let parsed: { trends?: Array<Record<string, string>> };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`AI response not valid JSON: ${text.substring(0, 200)}`);
    }

    const rawTrends = parsed?.trends;
    if (!Array.isArray(rawTrends) || rawTrends.length === 0) {
      throw new Error('AI returned no trend items');
    }

    // AI가 반환한 URL은 신뢰하지 않고 서버에서 검색 URL을 생성한다.
    const rows = rawTrends.map((item) => {
      const videoUrl = buildSearchUrl(item.platform, item.title);
      return {
        platform:  item.platform,
        region:    item.region,
        title:     item.title,
        subtitle:  item.subtitle,
        views:     item.views,
        likes:     item.likes,
        tags:      item.tags,
        url:       videoUrl,
        video_url: videoUrl,
      };
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 기존 데이터 전체 삭제 후 신규 삽입
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

// Vercel Cron(KST 00:00 = UTC 15:00)은 GET으로 호출합니다.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
