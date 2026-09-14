import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { constructStripeEvent, hasStripeConfiguration } from '@/services/billing/stripe';
import { confirmTossPayment, hasTossConfiguration } from '@/services/billing/toss';

export const runtime = 'nodejs';
export const maxDuration = 30;

function disabled(): NextResponse | null {
  if (process.env.NEXT_PUBLIC_ENABLE_PAYMENT !== 'true') {
    return NextResponse.json({ error: 'Payments are disabled.', code: 'PAYMENT_FEATURE_DISABLED' }, { status: 403 });
  }
  return null;
}

async function complete(orderId: string, provider: 'stripe' | 'toss', paymentKey: string, amountKrw: number) {
  const { data, error } = await createAdminClient().rpc('complete_verified_payment_order', {
    p_order_id: orderId,
    p_provider: provider,
    p_payment_key: paymentKey,
    p_amount_krw: amountKrw,
    p_amount_usd: amountKrw / 1380,
  });
  if (error) throw new Error(error.message);
  return data as Array<{ already_paid: boolean; credits_remaining: number }> | null;
}

async function stripeWebhook(req: NextRequest): Promise<NextResponse> {
  if (!hasStripeConfiguration()) return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });

  let event: Stripe.Event;
  try { event = constructStripeEvent(await req.text(), signature); }
  catch { return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 }); }
  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== 'paid' || !Number.isInteger(session.amount_total) || session.amount_total! <= 0) {
    return NextResponse.json({ error: 'Unverifiable Stripe checkout session' }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: order, error } = await admin.from('payment_orders')
    .select('order_id, plan_id, provider, expected_amount_krw, payment_key, status').eq('order_id', orderId).maybeSingle();
  if (error) return NextResponse.json({ error: 'Payment order lookup failed' }, { status: 500 });
  if (!order || order.provider !== 'stripe' || order.plan_id !== session.metadata?.planId || Number(order.expected_amount_krw) !== session.amount_total) {
    return NextResponse.json({ error: 'Payment order does not match checkout session' }, { status: 400 });
  }
  if (order.status === 'paid') return NextResponse.json({ received: true, duplicate: true });
  try {
    await complete(orderId, 'stripe', session.id, session.amount_total);
    return NextResponse.json({ received: true });
  } catch (completionError) {
    console.error('[billing] Stripe completion failed', completionError instanceof Error ? completionError.message : 'unknown');
    return NextResponse.json({ error: 'Credit update failed' }, { status: 500 });
  }
}

async function tossWebhook(req: NextRequest): Promise<NextResponse> {
  if (!hasTossConfiguration()) return NextResponse.json({ error: 'Toss is not configured.' }, { status: 503 });
  let body: { orderId?: unknown; paymentKey?: unknown; data?: { orderId?: unknown; paymentKey?: unknown } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const orderId = typeof body.orderId === 'string' ? body.orderId : typeof body.data?.orderId === 'string' ? body.data.orderId : null;
  const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey : typeof body.data?.paymentKey === 'string' ? body.data.paymentKey : null;
  if (!orderId || !paymentKey) return NextResponse.json({ error: 'Missing payment identifiers' }, { status: 400 });

  const admin = createAdminClient();
  const { data: order, error } = await admin.from('payment_orders')
    .select('order_id, provider, expected_amount_krw, payment_key, status').eq('order_id', orderId).maybeSingle();
  if (error) return NextResponse.json({ error: 'Payment order lookup failed' }, { status: 500 });
  if (!order || order.provider !== 'toss') return NextResponse.json({ error: 'Unknown payment order' }, { status: 404 });
  if (order.payment_key && order.payment_key !== paymentKey) return NextResponse.json({ error: 'Payment key mismatch' }, { status: 400 });
  if (order.status === 'paid') return NextResponse.json({ received: true, duplicate: true });

  let payment;
  try { payment = await confirmTossPayment({ paymentKey, orderId, expectedAmountKrw: Number(order.expected_amount_krw) }); }
  catch { return NextResponse.json({ error: 'Toss payment verification failed' }, { status: 502 }); }
  if (payment.status !== 'DONE' || payment.orderId !== orderId || payment.paymentKey !== paymentKey || payment.totalAmount !== Number(order.expected_amount_krw)) {
    return NextResponse.json({ error: 'Toss payment verification mismatch' }, { status: 400 });
  }
  try {
    await complete(orderId, 'toss', paymentKey, payment.totalAmount);
    return NextResponse.json({ received: true });
  } catch (completionError) {
    console.error('[billing] Toss completion failed', completionError instanceof Error ? completionError.message : 'unknown');
    return NextResponse.json({ error: 'Credit update failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = disabled();
  if (gate) return gate;
  return req.headers.has('stripe-signature') ? stripeWebhook(req) : tossWebhook(req);
}
