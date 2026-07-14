// ============================================================
// [SEALED MODULE] Stripe 결제 서비스
// ------------------------------------------------------------
// Phase 1 (현재): NEXT_PUBLIC_ENABLE_PAYMENT=false → 모든 함수 즉시 반환
// Phase 3 (사업자 등록 후): NEXT_PUBLIC_ENABLE_PAYMENT=true 로 변경하면
//   이 파일의 모든 로직이 자동으로 활성화됩니다.
// ============================================================

import Stripe from 'stripe';
import { CREDIT_PLANS } from '@/lib/credits';

// ─── Feature Gate ─────────────────────────────────────────────
function isPaymentEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PAYMENT === 'true';
}

// ─── Stripe 인스턴스 (Lazy Initialization) ────────────────────
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!isPaymentEnabled()) {
    throw new Error('[SEALED] 결제 기능이 비활성화 상태입니다. NEXT_PUBLIC_ENABLE_PAYMENT=true 설정 후 사용하세요.');
  }
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY 환경 변수가 설정되지 않았습니다.');
  _stripe = new Stripe(key);
  return _stripe;
}

// ─── 타입 정의 ────────────────────────────────────────────────
export interface CreateStripeSessionParams {
  userId: string;
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeSessionResult {
  sessionId: string;
  url: string;
}

// ─── Checkout 세션 생성 ───────────────────────────────────────
// Phase 3: 유저가 플랜을 선택하면 이 함수를 호출하여 Stripe Checkout 페이지로 리다이렉트
export async function createStripeSession({
  userId,
  planId,
  successUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard?payment=success`,
  cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/?payment=cancelled`,
}: CreateStripeSessionParams): Promise<StripeSessionResult> {
  if (!isPaymentEnabled()) {
    throw new Error('[SEALED] 결제 기능이 비활성화 상태입니다.');
  }

  const stripe = getStripe();
  const plan = CREDIT_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`유효하지 않은 플랜 ID: ${planId}`);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'krw',
          unit_amount: plan.priceKrw,
          product_data: {
            name: `${plan.name} 플랜 — ${plan.credits} 크레딧`,
            description: plan.description ?? '',
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      planId,
      credits: String(plan.credits),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) throw new Error('Stripe 세션 URL 생성 실패');
  return { sessionId: session.id, url: session.url };
}

// ─── Stripe 고객 ID 조회/생성 ─────────────────────────────────
// Phase 3: 구독 업그레이드/다운그레이드 시 사용
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  if (!isPaymentEnabled()) {
    throw new Error('[SEALED] 결제 기능이 비활성화 상태입니다.');
  }

  const stripe = getStripe();
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });

  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  return customer.id;
}

// ─── Webhook 이벤트 서명 검증 ─────────────────────────────────
export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  if (!isPaymentEnabled()) {
    throw new Error('[SEALED] 결제 기능이 비활성화 상태입니다.');
  }

  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET 환경 변수가 설정되지 않았습니다.');

  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
