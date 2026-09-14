import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const migration = () => read('supabase/migrations/20260914000026_security_and_topic_generation.sql');

describe('topic-only generation contracts', () => {
  it('stores a missing source URL as NULL and leaves debit/history atomic', () => {
    const sql = migration();
    expect(sql).toContain('ALTER COLUMN source_url DROP NOT NULL');
    expect(sql).toContain("NULLIF(BTRIM(p_source_url), '')");
    expect(sql).toContain('credits_remaining = credits_remaining - p_cost');
    expect(sql).toContain('INSERT INTO public.user_generation_history');
  });

  it('does not use URL analysis or cache persistence for a topic-only request', () => {
    const route = read('app/api/v1/analyze/route.ts');
    expect(route).toContain('normalizedUrl || null');
    expect(route).toContain('normalizedUrl\n    ? await supabase');
    expect(route).toContain('if (normalizedUrl) {');
  });

  it('does not create a clickable source link for null history URLs', () => {
    const page = read('app/history/page.tsx');
    expect(page).toContain("item.source_url?.trim() ? (");
    expect(page).toContain("return t('history_topic_short');");
    expect(page).toContain('Topic-based generation');
  });
});

describe('payment and ad verification contracts', () => {
  it('accepts only planId at billing start and derives the order server-side', () => {
    const route = read('app/api/v1/billing/route.ts');
    expect(route).toContain("key !== 'planId'");
    expect(route).toContain("CREDIT_PLANS.find");
    expect(route).toContain("from('payment_orders').insert");
    expect(route).toContain('PAYMENT_CONFIGURATION_MISSING');
  });

  it('verifies Stripe signatures and Toss payment status against the stored order', () => {
    const route = read('app/api/webhooks/billing/route.ts');
    expect(route).toContain('constructStripeEvent');
    expect(route).toContain("session.payment_status !== 'paid'");
    expect(route).toContain('confirmTossPayment');
    expect(route).toContain("payment.status !== 'DONE'");
    expect(route).toContain('complete_verified_payment_order');
    expect(route).not.toContain('metadata?.credits');
  });

  it('uses an idempotent server-only order completion RPC', () => {
    const sql = migration();
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.payment_orders');
    expect(sql).toContain("v_order.status = 'paid'");
    expect(sql).toContain('PAYMENT_AMOUNT_MISMATCH');
    expect(sql).toContain('PAYMENT_KEY_MISMATCH');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.complete_verified_payment_order');
  });

  it('never awards an ad credit based on an unverified browser callback', () => {
    const route = read('app/api/v1/monetization/ad-reward/route.ts');
    expect(route).toContain('ADS_REWARD_VERIFICATION_UNAVAILABLE');
    expect(route).not.toContain("claim_credit_via_ad");
  });
});

describe('admin, language, and trend contracts', () => {
  it('uses an atomic master profile/audit RPC and blocks self-sensitive updates', () => {
    const route = read('app/api/master/route.ts');
    expect(route).toContain("session.role !== 'master'");
    expect(route).toContain('You cannot change your own sensitive account fields.');
    expect(route).toContain('master_update_user_with_audit');
    expect(migration()).toContain('INSERT INTO public.admin_audit_logs');
  });

  it('uses English SSR and missing-key fallback through a global language provider', () => {
    const layout = read('app/layout.tsx');
    const provider = read('app/components/LanguageProvider.tsx');
    const translations = read('app/components/LanguageSwitcher.tsx');
    expect(layout).toContain('lang="en"');
    expect(provider).toContain("useState<AppLanguage>('en')");
    expect(translations).toContain('T.en[key] ?? key');
  });

  it('returns a degraded trend response and cron upserts updated rows', () => {
    const api = read('app/api/v1/trends/route.ts');
    const cron = read('app/api/cron/trend/route.ts');
    expect(api).toContain("errorCode: 'TREND_DB_UNAVAILABLE'");
    expect(cron).toContain("onConflict: 'platform,video_url'");
    expect(cron).toContain('updated_at: collectedAt');
    expect(migration()).toContain('ADD COLUMN IF NOT EXISTS updated_at');
  });
});
