import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { USD_TO_KRW_RATE } from '@/lib/credits';

export const runtime = 'nodejs';

// ─── [SEALED] Feature Gate: 결제 비활성화 시 즉시 반환 ──────────────────────
// Phase 1 (현재): NEXT_PUBLIC_ENABLE_PAYMENT=false → Webhook 진입 차단
// Phase 3 (사업자 등록 후): NEXT_PUBLIC_ENABLE_PAYMENT=true → 즉시 활성화

// ─── Stripe 인스턴스 (서버 전용) ─────────────────────────────

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  // apiVersion은 Stripe SDK 기본값 사용
  return new Stripe(key);
}

// ─── 공통: 크레딧 충전 RPC 호출 ─────────────────────────────

async function addCredits({
  userId,
  credits,
  provider,
  txId,
  amountUsd,
  amountKrw,
}: {
  userId: string;
  credits: number;
  provider: 'stripe' | 'toss';
  txId: string;
  amountUsd: number;
  amountKrw: number;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('add_user_credits', {
    p_user_id: userId,
    p_credits: credits,
    p_provider: provider,
    p_tx_id: txId,
    p_amount_usd: amountUsd,
    p_amount_krw: amountKrw,
  });

  if (error) {
    console.error(`[billing webhook] add_user_credits RPC failed (${provider}):`, error.message);
    throw new Error('RPC_FAILED');
  }
}

// ─── POST /api/webhooks/billing ───────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // [SEALED] Feature Gate — 결제 비활성화 시 Webhook 진입 차단
  if (process.env.NEXT_PUBLIC_ENABLE_PAYMENT !== 'true') {
    return NextResponse.json(
      { error: '결제 기능이 비활성화 상태입니다.', code: 'PAYMENT_FEATURE_DISABLED' },
      { status: 403 },
    );
  }

  const provider = req.headers.get('x-payment-provider') ?? 'stripe';

  // ── Stripe 처리 ───────────────────────────────────────────

  if (provider === 'stripe') {
    const stripe = getStripeClient();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return NextResponse.json({ error: 'Missing stripe signature or secret' }, { status: 400 });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[billing webhook] Stripe signature verification failed:', msg);
      return NextResponse.json({ error: `Stripe Webhook Error: ${msg}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const creditsToAdd = parseInt(session.metadata?.credits ?? '0', 10);
      const amountPaidUsd = session.amount_total ? session.amount_total / 100 : 0;

      if (!userId || creditsToAdd <= 0) {
        console.warn('[billing webhook] Stripe: missing userId or credits in metadata');
        return NextResponse.json({ received: true }, { status: 200 });
      }

      try {
        await addCredits({
          userId,
          credits: creditsToAdd,
          provider: 'stripe',
          txId: session.id,
          amountUsd: amountPaidUsd,
          amountKrw: Math.round(amountPaidUsd * USD_TO_KRW_RATE),
        });
      } catch {
        return NextResponse.json({ error: 'Credit update failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 토스페이먼츠 처리 ─────────────────────────────────────

  if (provider === 'toss') {
    let payload: {
      status?: string;
      orderId?: string;
      secret?: string;
      totalAmount?: number;
      metadata?: { userId?: string; credits?: string };
    };

    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status, orderId, totalAmount, metadata } = payload;

    // 토스 웹훅 시크릿 검증
    const tossSecret = process.env.TOSS_PAYMENTS_SECRET_KEY;
    if (!tossSecret) {
      return NextResponse.json({ error: 'Toss secret not configured' }, { status: 500 });
    }

    if (status !== 'DONE') {
      // DONE이 아닌 이벤트는 무시 (취소, 실패 등)
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const userId = metadata?.userId;
    const creditsToAdd = parseInt(metadata?.credits ?? '0', 10);
    const amountKrw = totalAmount ?? 0;

    if (!userId || creditsToAdd <= 0 || !orderId) {
      console.warn('[billing webhook] Toss: missing required fields in payload');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    try {
      await addCredits({
        userId,
        credits: creditsToAdd,
        provider: 'toss',
        txId: orderId,
        amountUsd: amountKrw / USD_TO_KRW_RATE,
        amountKrw,
      });
    } catch {
      return NextResponse.json({ error: 'Credit update failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  return NextResponse.json({ error: 'Unknown payment provider' }, { status: 400 });
}
