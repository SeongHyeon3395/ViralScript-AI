import 'server-only';

import Stripe from 'stripe';
import { CREDIT_PLANS } from '@/lib/credits';

let stripeClient: Stripe | undefined;

export function hasStripeConfiguration(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PAYMENT === 'true'
    && Boolean(process.env.STRIPE_SECRET_KEY)
    && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

function stripe(): Stripe {
  if (!hasStripeConfiguration()) throw new Error('STRIPE_PAYMENT_NOT_CONFIGURED');
  return stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function createStripeSession(input: {
  userId: string;
  planId: string;
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  const plan = CREDIT_PLANS.find((candidate) => candidate.id === input.planId);
  if (!plan) throw new Error('INVALID_PLAN');

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'krw',
        unit_amount: plan.priceKrw,
        product_data: { name: `${plan.name} (${plan.credits} credits)`, description: plan.description },
      },
      quantity: 1,
    }],
    metadata: { userId: input.userId, planId: plan.id, orderId: input.orderId, credits: String(plan.credits) },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  if (!session.url) throw new Error('STRIPE_CHECKOUT_URL_UNAVAILABLE');
  return { sessionId: session.id, url: session.url };
}

export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !hasStripeConfiguration()) throw new Error('STRIPE_PAYMENT_NOT_CONFIGURED');
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}
