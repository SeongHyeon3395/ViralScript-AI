// ============================================================
// [SEALED MODULE] 토스페이먼츠 결제 서비스
// ------------------------------------------------------------
// Phase 1 (현재): NEXT_PUBLIC_ENABLE_PAYMENT=false → 모든 함수 즉시 반환
// Phase 3 (사업자 등록 후): NEXT_PUBLIC_ENABLE_PAYMENT=true 로 변경하면
//   이 파일의 모든 로직이 자동으로 활성화됩니다.
// ============================================================

import { CREDIT_PLANS } from '@/lib/credits';

const TOSS_BASE_URL = 'https://api.tosspayments.com/v1';

// ─── Feature Gate ─────────────────────────────────────────────
function isPaymentEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PAYMENT === 'true';
}

// ─── 토스 Authorization 헤더 생성 ────────────────────────────
function getTossAuthHeader(): string {
  const key = process.env.TOSS_PAYMENTS_SECRET_KEY;
  if (!key) throw new Error('TOSS_PAYMENTS_SECRET_KEY 환경 변수가 설정되지 않았습니다.');
  const encoded = Buffer.from(`${key}:`).toString('base64');
  return `Basic ${encoded}`;
}

// ─── 타입 정의 ────────────────────────────────────────────────
export interface CreateTossSessionParams {
  userId: string;
  planId: string;
  orderId: string;
  successUrl?: string;
  failUrl?: string;
}

export interface TossConfirmParams {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentResult {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  metadata?: Record<string, string>;
}

// ─── 결제 승인 (Confirm) ──────────────────────────────────────
// Phase 3: 토스 결제 완료 후 successUrl 에서 paymentKey, orderId, amount 를 받아 승인 처리
export async function confirmTossPayment({
  paymentKey,
  orderId,
  amount,
}: TossConfirmParams): Promise<TossPaymentResult> {
  if (!isPaymentEnabled()) {
    throw new Error('[SEALED] 결제 기능이 비활성화 상태입니다.');
  }

  const res = await fetch(`${TOSS_BASE_URL}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: getTossAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`토스 결제 승인 실패: ${JSON.stringify(errBody)}`);
  }

  return res.json();
}

// ─── 결제 취소 ───────────────────────────────────────────────
export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string,
): Promise<void> {
  if (!isPaymentEnabled()) {
    throw new Error('[SEALED] 결제 기능이 비활성화 상태입니다.');
  }

  const res = await fetch(`${TOSS_BASE_URL}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: getTossAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`토스 결제 취소 실패: ${JSON.stringify(errBody)}`);
  }
}

// ─── 플랜 ID → 결제 금액 조회 ────────────────────────────────
export function getPlanAmount(planId: string): number {
  const plan = CREDIT_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`유효하지 않은 플랜 ID: ${planId}`);
  return plan.priceKrw;
}

// ─── Webhook 서명 검증 ────────────────────────────────────────
// 토스페이먼츠는 Webhook Secret 을 통해 이벤트 진위를 확인
export function verifyTossWebhookSecret(incomingSecret: string): boolean {
  if (!isPaymentEnabled()) return false;
  const expected = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
  if (!expected) return false;
  // 타이밍 어택 방지를 위한 길이 비교 포함
  if (incomingSecret.length !== expected.length) return false;
  return incomingSecret === expected;
}
