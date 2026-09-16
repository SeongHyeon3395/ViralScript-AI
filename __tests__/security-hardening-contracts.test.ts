import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const migration = () => read('supabase/migrations/20260914000026_security_and_topic_generation.sql');
const referralMigration = () => read('supabase/migrations/20260915000027_referrals_and_rewards.sql');
const emailRecoveryMigration = () => read('supabase/migrations/20260915000030_email_recovery_privacy.sql');
const inquiryWorkflowMigration = () => read('supabase/migrations/20260915000031_support_inquiry_workflow.sql');
const trendUpsertMigration = () => read('supabase/migrations/20260916000032_trend_feed_upsert_constraint.sql');

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

describe('signup form usability and password policy', () => {
  it('places the country selector above a full-width phone input', () => {
    const modal = read('app/components/AuthModal.tsx');
    expect(modal).toContain('<div className="relative w-full">');
    expect(modal).toContain('<div className="space-y-2">');
    expect(modal).toContain('htmlFor="signup-phone-number"');
    expect(modal).toContain('autoComplete="tel-national"');
  });

  it('shows localized signup requirements and does not apply signup-only rules to login', () => {
    const modal = read('app/components/AuthModal.tsx');
    const translations = read('app/components/LanguageSwitcher.tsx');
    expect(modal).toContain("minLength={mode === 'signup' ? 8 : undefined}");
    expect(modal).toContain("if (mode === 'signup' && password");
    expect(modal).toContain("t('auth_password_minimum')");
    expect(modal).toContain("t('auth_password_special_required')");
    expect(translations.match(/auth_password_minimum:/g)).toHaveLength(4);
    expect(translations.match(/auth_password_special_required:/g)).toHaveLength(4);
    expect(read('supabase/config.toml')).toContain('minimum_password_length = 8');
  });
});

describe('privacy, credits, and disabled reward UX', () => {
  it('returns only a masked email from the anonymous recovery RPC', () => {
    const sql = emailRecoveryMigration();
    expect(sql).toContain('RETURNS TABLE (masked_email TEXT)');
    expect(sql).not.toContain('RETURNS TABLE (email TEXT');
    expect(sql).not.toContain('SELECT p.email');
    expect(read('app/components/AuthModal.tsx')).not.toContain('Array<{ email: string; masked_email: string }>');
  });

  it('uses one server-derived eight-credit generation price everywhere', () => {
    expect(read('lib/credits.ts')).toContain('FULL_ANALYSIS: 8');
    expect(read('app/api/v1/analyze/route.ts')).toContain('관계없이 8크레딧');
    expect(read('app/components/GenerationResult.tsx')).toContain('CREDIT_COST.FULL_ANALYSIS');
    const translations = read('app/components/LanguageSwitcher.tsx');
    expect(translations).not.toMatch(/gen_(?:cost_value|create_plan_cost|credits_cost_range):[^\n]*5/);
  });

  it('keeps the unverified ad reward action disabled in the client', () => {
    const pricing = read('app/pricing/page.tsx');
    expect(pricing).toContain("NEXT_PUBLIC_ENABLE_ADS_REWARD === 'true'");
    expect(pricing).toContain('disabled: !ADS_REWARD_ENABLED');
    expect(pricing).toContain('{ADS_REWARD_ENABLED && <RewardedAdPopup');
    expect(read('app/generator/page.tsx')).toContain('{ADS_REWARD_ENABLED && <RewardedAdPopup');
  });

  it('aligns the legal documents with stored data and the eight-credit policy', () => {
    const privacy = read('app/privacy/page.tsx');
    const terms = read('app/terms/page.tsx');
    expect(privacy).toContain('국가번호, 전화번호');
    expect(privacy).toContain('Ad rewards are currently disabled');
    expect(terms).toContain('생성 1회당 8크레딧');
    expect(terms).toContain('Each completed generation costs eight credits');
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

  it('uses an actual unique constraint for daily trend upserts and collects enough candidates to avoid stale top-ten refreshes', () => {
    const cron = read('app/api/cron/trend/route.ts');
    expect(trendUpsertMigration()).toContain('ADD CONSTRAINT trend_feed_platform_video_url_unique UNIQUE (platform, video_url)');
    expect(trendUpsertMigration()).toContain('DROP INDEX IF EXISTS public.trend_feed_platform_video_url_unique');
    expect(cron).toContain('const CANDIDATES_PER_PLATFORM = 50');
    expect(cron).toContain('selectDailyTrendRows(candidates, existingKeys, DAILY_NEW_TARGET)');
    expect(cron).toContain(".in('video_url', candidateUrls)");
  });

  it('adds browser security headers and recovers visibly from settings load failures', () => {
    const config = read('next.config.ts');
    const settings = read('app/settings/page.tsx');
    expect(config).toContain("key: 'Content-Security-Policy'");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("key: 'X-Content-Type-Options'");
    expect(config).toContain('poweredByHeader: false');
    expect(settings).toContain("setLoadError(t('settings_load_failed'))");
    expect(settings).toContain("t('settings_retry')");
    expect(settings).toContain("t('auth_password_special_char')");
    expect(settings).toContain('aria-pressed={checked}');
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

  it('tracks inquiry handling and its audit record in one database transaction', () => {
    const sql = inquiryWorkflowMigration();
    const masterRoute = read('app/api/master/route.ts');
    expect(sql).toContain("CHECK (status IN ('new', 'in_progress', 'resolved'))");
    expect(sql).toContain('INSERT INTO public.admin_audit_logs');
    expect(sql).toContain('ADMIN_ROLE_REQUIRED');
    expect(masterRoute).toContain("action: 'update_inquiry'");
    expect(masterRoute).toContain('master_update_inquiry_with_audit');
  });
});
