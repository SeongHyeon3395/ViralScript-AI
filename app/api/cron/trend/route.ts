import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300;

// ─── 검색 URL 폴백 생성기 ─────────────────────────────────────────
function buildFallbackUrl(platform: string, title: string): string {
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
          video_url:{ type: 'string' as const },
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
- video_url: the REAL public URL of the video post.
  * For TikTok: https://www.tiktok.com/@{creator}/video/{id}
  * For YouTube Shorts: https://www.youtube.com/shorts/{id}
  * For Instagram Reels: https://www.instagram.com/reel/{id}/
  If you cannot find the EXACT URL of a real post, output an empty string "" — the server will replace it with a search URL. Never fabricate a URL with a fake ID.

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

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: trendItemSchema,
        tools: [{ googleSearch: {} }],
        temperature: 0.8,
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

    // video_url이 빈 문자열이면 검색 URL로 대체 — 유저가 클릭 시 항상 실제 페이지에 도달
    const rows = rawTrends.map((item) => {
      const videoUrl = item.video_url?.trim() || buildFallbackUrl(item.platform, item.title);
      return {
        platform:  item.platform,
        region:    item.region,
        title:     item.title,
        subtitle:  item.subtitle,
        views:     item.views,
        likes:     item.likes,
        tags:      item.tags,
        url:       videoUrl,
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
