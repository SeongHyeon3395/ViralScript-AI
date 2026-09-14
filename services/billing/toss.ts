import 'server-only';

const TOSS_BASE_URL = 'https://api.tosspayments.com/v1';

export interface TossPaymentResult {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
}

export function hasTossConfiguration(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PAYMENT === 'true' && Boolean(process.env.TOSS_PAYMENTS_SECRET_KEY);
}

function authorization(): string {
  const secret = process.env.TOSS_PAYMENTS_SECRET_KEY;
  if (!secret) throw new Error('TOSS_PAYMENT_NOT_CONFIGURED');
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`;
}

/** Confirm against Toss using the amount retained in payment_orders, never the webhook body. */
export async function confirmTossPayment(input: { paymentKey: string; orderId: string; expectedAmountKrw: number }): Promise<TossPaymentResult> {
  if (!hasTossConfiguration()) throw new Error('TOSS_PAYMENT_NOT_CONFIGURED');
  const response = await fetch(`${TOSS_BASE_URL}/payments/confirm`, {
    method: 'POST',
    headers: { Authorization: authorization(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey: input.paymentKey, orderId: input.orderId, amount: input.expectedAmountKrw }),
  });
  if (!response.ok) throw new Error('TOSS_PAYMENT_VERIFICATION_FAILED');
  return response.json() as Promise<TossPaymentResult>;
}
