import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/cron/cleanup-unverified ───────────────────────────
// Vercel Cron Job: 24시간 이상 이메일 미인증 유저 자동 삭제
// vercel.json에서 매일 새벽 2시 UTC에 실행되도록 설정됨
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Cron Secret 검증 (Vercel Cron만 호출 가능)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.rpc('cleanup_unverified_users');

    if (error) {
      console.error('[Cron] cleanup_unverified_users RPC failed:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('[Cron] ✅ Unverified users cleanup completed');
    return NextResponse.json({
      success: true,
      message: 'Unverified users cleanup completed',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Cron] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
