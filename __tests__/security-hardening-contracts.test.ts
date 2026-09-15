import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const migration = () => read('supabase/migrations/20260914000026_security_and_topic_generation.sql');
const referralMigration = () => read('supabase/migrations/20260915000027_referrals_and_rewards.sql');

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

describe('generator localization', () => {
  it('renders the generation form and selected options from all four language dictionaries', () => {
    const page = read('app/generator/page.tsx');
    const translations = read('app/components/LanguageSwitcher.tsx');
    for (const key of ['gen_analysis_heading', 'gen_content_goal_heading', 'gen_concept_heading', 'gen_mood', 'gen_cast', 'gen_video_length', 'gen_language', 'gen_production_method', 'gen_summary_cost']) {
      expect(page).toContain(`t('${key}')`);
    }
    expect(page).toContain('localizedOption(option)');
    for (const language of ['ko', 'en', 'zh', 'ja']) {
      const start = translations.indexOf(`  ${language}: {`);
      const next = Math.min(...['ko', 'en', 'zh', 'ja'].map(code => {
        const index = translations.indexOf(`\n  ${code}: {`, start + 1);
        return index < 0 ? Number.POSITIVE_INFINITY : index;
      }));
      const dictionary = translations.slice(start, next);
      for (const key of ['gen_analysis_heading', 'gen_goal_inform', 'gen_concept_problem', 'gen_method_ai', 'gen_summary_cost']) {
        expect(dictionary, `${language} translation missing ${key}`).toContain(`${key}:`);
      }
    }
  });
});

describe('referral signup and reward flow', () => {
  it('assigns each profile a unique persisted code and awards both accounts once in the auth transaction', () => {
    const sql = referralMigration();
    expect(sql).toContain('profiles_referral_code_uidx');
    expect(sql).toContain('referred_user_id UUID NOT NULL UNIQUE');
    expect(sql).toContain("NEW.raw_user_meta_data->>'referral_code'");
    expect(sql).toContain('ON CONFLICT (referred_user_id) DO NOTHING');
    expect(sql).toContain('credits_remaining = credits_remaining + 3');
    expect(sql).toContain('referral_not_self');
  });

  it('validates codes server-side and returns referral stats only to the signed-in owner', () => {
    const route = read('app/api/v1/referrals/route.ts');
    expect(route).toContain("/^[A-F0-9]{12}$/");
    expect(route).toContain("authorization.slice(7)");
    expect(route).toContain("eq('referrer_user_id' as never");
    expect(route).toContain('referralUrl');
  });

  it('puts the optional code at signup, validates it, and passes it to the auth trigger metadata', () => {
    const modal = read('app/components/AuthModal.tsx');
    expect(modal).toContain('id="signup-referral-code"');
    expect(modal).toContain("fetch(`/api/v1/referrals?code=${encodeURIComponent(normalizedReferralCode)}`)");
    expect(modal).toContain('referral_code: normalizedReferralCode || undefined');
    expect(read('app/components/ReferralSystem.tsx')).not.toContain('generateReferralCode');
  });

  it('localizes the settings screen and requested credit/trend labels across four languages', () => {
    const settings = read('app/settings/page.tsx');
    const pricing = read('app/pricing/page.tsx');
    const trends = read('app/components/TrendFeed.tsx');
    const dictionaries = read('app/components/LanguageSwitcher.tsx');
    expect(settings).toContain("labelKey: 'settings_tab_profile'");
    expect(settings).toContain('t(labelKey)');
    expect(settings).toContain("t('settings_delete_warning')");
    expect(settings).toContain('void setLanguage(v)');
    expect(pricing).toContain("t('pricing_credits_balance')");
    expect(trends).toContain("t('trend_sort_latest')");
    expect(trends).toContain("t('trend_sort_popular')");
    for (const key of ['settings_title', 'settings_delete_warning', 'pricing_credits_balance', 'trend_sort_latest', 'trend_sort_popular']) {
      expect(dictionaries.match(new RegExp(`${key}:`, 'g'))).toHaveLength(4);
    }
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

describe('support inquiry contracts', () => {
  it('derives inquiry sender identity from the authenticated server session', () => {
    const route = read('app/api/v1/contact/route.ts');
    expect(route).toContain('supabase.auth.getUser(authorization.slice(7))');
    expect(route).toContain('userId = authData.user.id');
    expect(route).toContain('senderEmail = authData.user.email');
    expect(route).toContain('user_id: userId');
    expect(route).toContain('sender_email: senderEmail');
    expect(route).toContain("from('support_inquiries').insert");
    expect(route).not.toContain('body.userId');
    expect(route).not.toContain('body.email');
  });

  it('allows a suspension appeal only for an already-suspended account', () => {
    const contact = read('app/api/v1/contact/route.ts');
    const migration = read('supabase/migrations/20260915000029_suspension_appeals.sql');
    expect(contact).toContain("body.category === 'suspension_appeal'");
    expect(contact).toContain(".eq('is_suspended', true)");
    expect(contact).toContain("body.category === 'suspension_appeal'");
    expect(migration).toContain("'suspension_appeal'");
  });

  it('enforces suspension in Auth, profile reads, and generation requests', () => {
    const master = read('app/api/master/route.ts');
    const profile = read('app/api/v1/profile/route.ts');
    const analyze = read('app/api/v1/analyze/route.ts');
    const authProvider = read('app/components/AuthProvider.tsx');
    const authModal = read('app/components/AuthModal.tsx');
    expect(master).toContain('auth.admin.updateUserById');
    expect(master).toContain("ban_duration: body.suspended ? '876000h' : 'none'");
    expect(profile).toContain('ACCOUNT_SUSPENDED');
    expect(analyze).toContain('Account suspended');
    expect(authProvider).toContain('checkAccountSuspension');
    expect(authModal).toContain('auth_suspended_appeal');
  });

  it('stores support inquiries privately and presents them in the protected Master Console', () => {
    const sql = read('supabase/migrations/20260915000028_support_inquiries.sql');
    const masterRoute = read('app/api/master/route.ts');
    const consoleSource = read('app/Master/MasterConsole.tsx');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.support_inquiries');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON TABLE public.support_inquiries FROM PUBLIC, anon, authenticated');
    expect(masterRoute).toContain("resource === 'inquiries'");
    expect(masterRoute).toContain("from('support_inquiries')");
    expect(consoleSource).toContain('InquiriesPanel');
    expect(consoleSource).toContain('inquiryCategory');
  });
});
