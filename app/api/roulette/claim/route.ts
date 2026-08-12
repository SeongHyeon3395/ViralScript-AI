import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createAdminClient();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const user = userData.user;

  const { error: profileError } = await supabase.from('profiles').upsert(
    { id: user.id, email: user.email ?? '' } as never,
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (profileError) {
    console.error('[roulette/claim] profile upsert failed:', profileError.message);
    return NextResponse.json({ success: false, error: '프로필을 준비하지 못했습니다.' }, { status: 500 });
  }

  const { data: awardedCredits, error } = await supabase.rpc('claim_daily_bonus', {
    target_user_id: user.id,
    bonus_credits: null,
  } as never);

  if (error) {
    if (error.message?.includes('ERR_DAILY_BONUS_ALREADY_CLAIMED')) {
      return NextResponse.json(
        { success: false, error: '오늘은 이미 룰렛 보상을 받았습니다.', code: 'ERR_DAILY_BONUS_ALREADY_CLAIMED' },
        { status: 429 },
      );
    }

    console.error('[roulette/claim] claim_daily_bonus RPC failed:', error.message);
    return NextResponse.json({ success: false, error: '크레딧 지급 중 오류가 발생했습니다.' }, { status: 500 });
  }

  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select('credits_remaining')
    .eq('id', user.id)
    .maybeSingle<{ credits_remaining: number }>();

  if (profileFetchError) {
    console.warn('[roulette/claim] current credit fetch failed:', profileFetchError.message);
  }

  return NextResponse.json({
    success: true,
    creditsAwarded: typeof awardedCredits === 'number' ? awardedCredits : 0,
    currentCredits: profile?.credits_remaining ?? null,
  });
}