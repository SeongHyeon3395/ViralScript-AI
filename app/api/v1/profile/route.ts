import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type AdminClient = ReturnType<typeof createAdminClient>;

async function authenticatedUser(req: NextRequest, supabase: AdminClient): Promise<User | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  return error ? null : data.user;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createAdminClient();
  const user = await authenticatedUser(req, supabase);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error: upsertError } = await supabase.from('profiles').upsert(
    { id: user.id, email: user.email ?? '' } as never,
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (upsertError) {
    console.warn('[profile] profile upsert failed:', upsertError.message);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, credits_remaining, default_language, last_roulette_spin_at, is_suspended, suspension_reason')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if ((profile as { is_suspended?: boolean }).is_suspended) {
    return NextResponse.json({ error: 'ACCOUNT_SUSPENDED', suspensionReason: (profile as { suspension_reason?: string | null }).suspension_reason ?? null }, { status: 403 });
  }

  return NextResponse.json({ data: profile });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = createAdminClient();
  const user = await authenticatedUser(req, supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (Number(req.headers.get('content-length') ?? 0) > 8_192) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const allowed = new Set([
    'fullName', 'themePreference', 'defaultLanguage', 'emailNotifications',
    'defaultTargetPlatform', 'phoneCountryCode', 'phoneNumber',
  ]);
  if (!body || Array.isArray(body) || Object.keys(body).some((key) => !allowed.has(key))) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const fullName = body.fullName;
  const themePreference = body.themePreference;
  const defaultLanguage = body.defaultLanguage;
  const emailNotifications = body.emailNotifications;
  const defaultTargetPlatform = body.defaultTargetPlatform;
  const phoneCountryCode = body.phoneCountryCode;
  const phoneNumber = body.phoneNumber;

  if (fullName !== undefined && fullName !== null && (typeof fullName !== 'string' || fullName.length > 100)) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }
  if (themePreference !== undefined && !['dark', 'light', 'system'].includes(String(themePreference))) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  }
  if (defaultLanguage !== undefined && !['ko', 'en', 'ja', 'zh'].includes(String(defaultLanguage))) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }
  if (emailNotifications !== undefined && typeof emailNotifications !== 'boolean') {
    return NextResponse.json({ error: 'Invalid notification setting' }, { status: 400 });
  }
  if (defaultTargetPlatform !== undefined && !['tiktok', 'youtube'].includes(String(defaultTargetPlatform))) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }
  if ((phoneCountryCode === undefined) !== (phoneNumber === undefined)) {
    return NextResponse.json({ error: 'Phone fields are required together' }, { status: 400 });
  }
  if (phoneCountryCode !== undefined && (
    typeof phoneCountryCode !== 'string' || !/^\+[0-9]{1,4}$/.test(phoneCountryCode)
    || typeof phoneNumber !== 'string' || !/^[0-9]{6,20}$/.test(phoneNumber)
  )) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  }

  const { data: account, error: accountError } = await supabase
    .from('profiles')
    .select('is_suspended')
    .eq('id', user.id)
    .maybeSingle<{ is_suspended: boolean }>();
  if (accountError) return NextResponse.json({ error: 'Profile unavailable' }, { status: 500 });
  if (account?.is_suspended) return NextResponse.json({ error: 'ACCOUNT_SUSPENDED' }, { status: 403 });

  const { error } = await supabase.rpc('update_user_settings_server', {
    p_user_id: user.id,
    p_full_name: typeof fullName === 'string' ? fullName.trim() || null : null,
    p_theme_preference: typeof themePreference === 'string' ? themePreference : null,
    p_default_language: typeof defaultLanguage === 'string' ? defaultLanguage : null,
    p_email_notifications: typeof emailNotifications === 'boolean' ? emailNotifications : null,
    p_default_target_platform: typeof defaultTargetPlatform === 'string' ? defaultTargetPlatform : null,
    p_phone_country_code: typeof phoneCountryCode === 'string' ? phoneCountryCode : null,
    p_phone_number: typeof phoneNumber === 'string' ? phoneNumber : null,
  } as never);

  if (error) {
    console.error('[profile] update failed:', error.message);
    return NextResponse.json({ error: 'Profile update failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const supabase = createAdminClient();
  const user = await authenticatedUser(req, supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.rpc('delete_user_account_server', { p_user_id: user.id } as never);
  if (error) {
    console.error('[profile] account deletion failed:', error.message);
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
