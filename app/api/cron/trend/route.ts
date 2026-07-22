import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

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
        },
        required: ['platform', 'region', 'title', 'subtitle', 'views', 'likes', 'tags'],
      },
    },
  },
  required: ['trends'],
};

const SYSTEM_PROMPT = `You are a 2026 Global Short-Form Trend Analyst. Your job is to produce a JSON array of at least 36 fictitious but highly realistic trending short-form video summaries across regions (US, KR, JP) and platforms (TikTok, YouTube Shorts, Instagram Reels).

Requirements:
- Generate AT LEAST 36 items in total (12 items for US, 12 items for KR, 12 items for JP).
- Within each region (US, KR, JP), distribute evenly across TikTok, YouTube Shorts, and Instagram Reels (4 items per platform per region).

For each item, return:
- platform: "TikTok" or "YouTube Shorts" or "Instagram Reels"
- region: "US" or "KR" or "JP"
- title: a compelling, clickable headline in the region's native language (Korean for KR, Japanese for JP, English for US)
- subtitle: one-sentence description of why this trend is viral (native language)
- views: realistic high view count string, e.g. "3.2M", "1.1M", "890K"
- likes: realistic like count string, e.g. "450K", "120K"
- tags: 2-3 comma-separated hashtag-style tags in native language, e.g. "#AI챌린지,#숏폼대박"

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

    // 2. Supabase Service Role 연결
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 3. 트랜잭션: DELETE + INSERT
    await supabase.from('trend_feed').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const rows = trends.map((t) => ({
      platform: t.platform,
      region: t.region,
      title: t.title,
      subtitle: t.subtitle,
      views: t.views,
      likes: t.likes,
      tags: t.tags,
    }));

    const { error: insertErr } = await supabase.from('trend_feed').insert(rows);
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error('[cron/trend]', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
