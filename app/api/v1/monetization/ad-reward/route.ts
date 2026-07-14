import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// ─── Feature Gate: 광고 보상 비활성화 시 차단 ─────────────────────────────────

function assertAdsEnabled(): NextResponse | null {
  if (process.env.NEXT_PUBLIC_ENABLE_ADS_REWARD !== 'true') {
    return NextResponse.json(
      {
        error: '광고 보상 기능이 비활성화되어 있습니다.',
        code: 'ADS_REWARD_FEATURE_DISABLED',
      },
      { status: 403 },
    );
  }
  return null;
}

// ─── POST /api/v1/monetization/ad-reward ─────────────────────────────────────
// 구글 애드센스 rewardGranted 이벤트 발생 후 클라이언트가 호출하는 서버리스 엔드포인트.
// Supabase RPC claim_credit_via_ad 를 통해 원자적으로 크레딧을 지급한다.
// 일일 5회 제한, 어뷰징 방지는 DB 레이어에서 처리.

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Feature Gate 확인
  const gate = assertAdsEnabled();
  if (gate) return gate;

  // 인증 확인
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 요청 바디 파싱
  let body: { adUnitId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const adUnitId = body.adUnitId ?? process.env.NEXT_PUBLIC_ADSENSE_REWARDED_AD_SLOT ?? 'unknown';

  // Admin 클라이언트로 RPC 호출 (SECURITY DEFINER 함수라 RLS 우회)
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_credit_via_ad', {
    target_user_id: user.id,
    target_ad_unit_id: adUnitId,
  });

  if (error) {
    // 일일 한도 초과
    if (error.message?.includes('ERR_DAILY_AD_LIMIT_EXCEEDED')) {
      return NextResponse.json(
        {
          error: '오늘의 광고 보상 한도(5회)에 도달했습니다. 내일 다시 시도해주세요.',
          code: 'ERR_DAILY_AD_LIMIT_EXCEEDED',
        },
        { status: 429 },
      );
    }

    console.error('[ad-reward] claim_credit_via_ad RPC 실패:', error.message);
    return NextResponse.json(
      { error: '크레딧 지급 중 오류가 발생했습니다.', code: 'RPC_FAILED' },
      { status: 500 },
    );
  }

  // data = 최종 업데이트된 크레딧 잔여량 (INT)
  return NextResponse.json({
    success: true,
    creditsAwarded: 3,
    currentCredits: data as number,
  });
}
