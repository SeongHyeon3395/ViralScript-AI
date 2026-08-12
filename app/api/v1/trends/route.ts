import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

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

    const trends = (data ?? []).map((item) => ({
      ...item,
      video_url: item.video_url ?? item.url ?? null,
    }));

    return NextResponse.json(
      { trends, updatedAt: trends[0]?.created_at ?? null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('[trends] unexpected error:', error);
    return NextResponse.json({ trends: [], updatedAt: null }, { status: 200 });
  }
}
