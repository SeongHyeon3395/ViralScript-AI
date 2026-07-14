import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// ─── Feature Gate: 결제 비활성화 원자 차단 ──────────────────────────────────
// Phase 1 (사업자 등록 전): NEXT_PUBLIC_ENABLE_PAYMENT=false → 즉시 403 반환
// Phase 3 (사업자 등록 후): NEXT_PUBLIC_ENABLE_PAYMENT=true  → 결제 로직 진입 허용

function assertPaymentEnabled(): NextResponse | null {
  if (process.env.NEXT_PUBLIC_ENABLE_PAYMENT !== 'true') {
    return NextResponse.json(
      {
        error: '결제 기능이 일시 비활성화되어 있습니다.',
        code: 'PAYMENT_FEATURE_DISABLED',
        message: '현재 광고 보상형 무료 크레딧 충전을 이용하실 수 있습니다.',
      },
      { status: 403 },
    );
  }
  return null;
}

// ─── GET /api/v1/billing — 플랜 목록 및 현재 구독 조회 ───────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gate = assertPaymentEnabled();
  if (gate) return gate;

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tier, credits, stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: '프로필 조회 실패' }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// ─── POST /api/v1/billing — 결제 세션 생성 ───────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = assertPaymentEnabled();
  if (gate) return gate;

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  let body: { planId?: string; provider?: 'stripe' | 'toss' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { planId, provider = 'stripe' } = body;
  if (!planId) {
    return NextResponse.json({ error: 'planId가 필요합니다.' }, { status: 400 });
  }

  // Phase 3 활성화 시 여기에 Stripe / Toss 결제 세션 생성 로직 추가
  // import { createStripeSession } from '@/services/billing/stripe';
  // import { createTossSession } from '@/services/billing/toss';
  // const session = provider === 'toss'
  //   ? await createTossSession({ userId: user.id, planId })
  //   : await createStripeSession({ userId: user.id, planId });
  // return NextResponse.json({ url: session.url });

  void provider; // Phase 3 전까지는 사용하지 않음 (lint 경고 방지)

  return NextResponse.json(
    {
      error: '결제 기능이 준비 중입니다.',
      code: 'PAYMENT_FEATURE_DISABLED',
    },
    { status: 403 },
  );
}
