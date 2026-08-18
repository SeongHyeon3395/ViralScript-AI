import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeAndValidateUrl } from '@/utils/urlNormalizer';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('trend_feed')
      .select('id, platform, region, title, subtitle, views, likes, tags, video_url, url, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[trends] query failed:', error.message);
      return NextResponse.json({ trends: [], updatedAt: null }, { status: 200 });
    }

    const trends = (data ?? []).map((item) => {
      const videoUrl = item.video_url ?? item.url ?? null;
      if (!videoUrl) return null;
      try {
        const normalized = normalizeAndValidateUrl(videoUrl);
        const expectedPlatform = item.platform.toLowerCase().includes('youtube') ? 'youtube'
          : item.platform.toLowerCase().includes('tiktok') ? 'tiktok' : 'instagram';
        if (normalized.platform !== expectedPlatform) return null;
        return { ...item, video_url: normalized.normalizedUrl };
      } catch {
        return null;
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json(
      { trends, updatedAt: trends[0]?.created_at ?? null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('[trends] unexpected error:', error);
    return NextResponse.json({ trends: [], updatedAt: null }, { status: 200 });
  }
}
