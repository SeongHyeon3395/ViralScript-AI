import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { fetchVideoMetadata } from '@/services/scraperMiddleware';
import { normalizeAndValidateUrl } from '@/utils/urlNormalizer';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── Trend Feed AI 스키마 ────────────────────────────────────────
const trendItemSchema = {
  type: 'object' as const,
  properties: {
    trends: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          platform: { type: 'string' as const, enum: ['TikTok', 'YouTube Shorts', 'Instagram Reels'] },
          region: { type: 'string' as const, enum: ['US', 'KR', 'JP'] },
          title: { type: 'string' as const },
          subtitle: { type: 'string' as const },
          views: { type: 'string' as const },
          likes: { type: 'string' as const },
          tags: { type: 'string' as const },
          url: { type: 'string' as const },
        },
        required: ['platform', 'region', 'title', 'subtitle', 'views', 'likes', 'tags'],
      },
    },
  },
  required: ['trends'],
};

const SYSTEM_PROMPT = `You are a 2026 Global Short-Form Trend Analyst. Your job is to produce a JSON array of trending short-form video candidates across regions (US, KR, JP) and platforms (TikTok, YouTube Shorts, Instagram Reels). URLs will be verified by the server, so never invent a URL.

Requirements:
- Generate AT LEAST 90 items in total (30 items for US, 30 items for KR, 30 items for JP).
- Within each region (US, KR, JP), distribute evenly across TikTok, YouTube Shorts, and Instagram Reels (10 items per platform per region).

For each item, return:
- platform: "TikTok" or "YouTube Shorts" or "Instagram Reels"
- region: "US" or "KR" or "JP"
- title: a compelling, clickable headline in the region's native language (Korean for KR, Japanese for JP, English for US)
- subtitle: one-sentence description of why this trend is viral (native language)
- views: realistic high view count string, e.g. "3.2M", "1.1M", "890K"
- likes: realistic like count string, e.g. "450K", "120K"
- tags: 2-3 comma-separated hashtag-style tags in native language, e.g. "#AI챌린지,#숏폼대박"
- url: the exact public URL of a real existing post. Never invent, fabricate, or approximate a URL. If you do not know a real URL, omit that candidate rather than guessing.

Ensure topics span diverse viral categories: AI tools & filters, K-pop/beauty/fashion, food hacks, funny skits, ASMR, tech productivity, viral dance challenges.

Return ONLY valid JSON according to the schema. No markdown wrappers.`;

// ─── POST /api/cron/trend ────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 보안 — CRON_SECRET 검증 (로컬 개발 시 패스)
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Gemini AI 호출
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
        temperature: 0.9,
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

    const trends = parsed?.trends;
    if (!Array.isArray(trends) || trends.length === 0) {
      throw new Error('AI returned no trend items');
    }

    // 실제 게시물 검증: 메타데이터 수집에 성공한 후보만 저장합니다.
    const verified = await Promise.all(
      trends.map(async (trend) => {
        try {
          const rawUrl = trend.url?.trim();
          if (!rawUrl) return null;
          const normalized = normalizeAndValidateUrl(rawUrl);
          await fetchVideoMetadata(normalized.normalizedUrl, normalized.platform);
          return trend;
        } catch {
          return null;
        }
      })
    );
    const verifiedTrends = verified.filter((trend): trend is Record<string, string> => trend !== null);
    if (verifiedTrends.length === 0) {
      throw new Error('No real public trend posts were verified; existing feed was preserved');
    }

    // Supabase Service Role 연결
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 트랜잭션: DELETE + INSERT
    const { error: deleteErr } = await supabase.from('trend_feed').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteErr) throw new Error(`DB delete failed: ${deleteErr.message}`);

    const rows = verifiedTrends.map((t) => ({
      platform: t.platform,
      region: t.region,
      title: t.title,
      subtitle: t.subtitle,
      views: t.views,
      likes: t.likes,
      tags: t.tags,
      url: t.url,
    }));

    const { error: insertErr } = await supabase.from('trend_feed').insert(rows);
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error('[cron/trend]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

// Vercel Cron은 스케줄 작업을 GET으로 호출합니다.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
