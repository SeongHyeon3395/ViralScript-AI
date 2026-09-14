import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { CREDIT_PLANS } from '@/lib/credits';
import { createAdminClient } from '@/lib/supabase/server';
import { createStripeSession, hasStripeConfiguration } from '@/services/billing/stripe';

export const runtime = 'nodejs';
export const maxDuration = 30;

function paymentDisabledResponse(): NextResponse | null {
  if (process.env.NEXT_PUBLIC_ENABLE_PAYMENT !== 'true') {
    return NextResponse.json({ error: 'Payments are currently disabled.', code: 'PAYMENT_FEATURE_DISABLED' }, { status: 403 });
  }
  if (!hasStripeConfiguration()) {
    return NextResponse.json({ error: 'Payment service is not configured.', code: 'PAYMENT_CONFIGURATION_MISSING' }, { status: 503 });
  }
  return null;
}

async function authenticatedUser(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const { data, error } = await createAdminClient().auth.getUser(authorization.slice(7));
  return error ? null : data.user;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gate = paymentDisabledResponse();
  if (gate) return gate;
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await createAdminClient().from('profiles')
    .select('subscription_plan, credits_remaining').eq('id', user.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Failed to load billing profile' }, { status: 500 });
  return NextResponse.json({ profile: data, plans: CREDIT_PLANS.map(({ id, name, credits, priceKrw }) => ({ id, name, credits, priceKrw })) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = paymentDisabledResponse();
  if (gate) return gate;
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => key !== 'planId')) {
    return NextResponse.json({ error: 'Only planId may be supplied.' }, { status: 400 });
  }
  const planId = (body as { planId?: unknown }).planId;
  if (typeof planId !== 'string') return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  const plan = CREDIT_PLANS.find((candidate) => candidate.id === planId);
  if (!plan) return NextResponse.json({ error: 'Unknown plan.', code: 'INVALID_PLAN' }, { status: 400 });

  const admin = createAdminClient();
  const orderId = `vs_${randomUUID().replaceAll('-', '')}`;
  const { error: orderError } = await admin.from('payment_orders').insert({
    order_id: orderId, user_id: user.id, plan_id: plan.id, provider: 'stripe',
    expected_amount_krw: plan.priceKrw, expected_credits: plan.credits, status: 'pending',
  });
  if (orderError) {
    console.error('[billing] failed to create payment order', orderError.message);
    return NextResponse.json({ error: 'Failed to initialize payment.' }, { status: 500 });
  }

  try {
    const origin = req.nextUrl.origin;
    const session = await createStripeSession({
      userId: user.id, planId: plan.id, orderId,
      successUrl: `${origin}/pricing?payment=success`, cancelUrl: `${origin}/pricing?payment=cancelled`,
    });
    return NextResponse.json({ provider: 'stripe', checkoutUrl: session.url });
  } catch (error) {
    console.error('[billing] checkout initialization failed', error instanceof Error ? error.message : 'unknown');
    await admin.from('payment_orders').update({ status: 'failed' }).eq('order_id', orderId).eq('status', 'pending');
    return NextResponse.json({ error: 'Payment checkout is unavailable.', code: 'PAYMENT_PROVIDER_UNAVAILABLE' }, { status: 503 });
  }
}
