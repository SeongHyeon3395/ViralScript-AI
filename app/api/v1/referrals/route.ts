import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createAdminClient();
  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();

  // Public validation reveals only whether a high-entropy code exists, never its owner.
  if (code !== undefined && code !== null) {
    if (!/^[A-F0-9]{12}$/.test(code)) return NextResponse.json({ valid: false });
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code' as never, code as never)
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'Referral validation unavailable' }, { status: 503 });
    return NextResponse.json({ valid: Boolean(data) });
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7));
  if (authError || !authData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profileData, error: profileError }, { count, error: eventsError }] = await Promise.all([
    supabase.from('profiles').select('referral_code' as never).eq('id', authData.user.id).maybeSingle(),
    supabase.from('referral_events').select('id', { count: 'exact', head: true }).eq('referrer_user_id' as never, authData.user.id as never),
  ]);

  const profile = profileData as unknown as { referral_code: string } | null;
  if (profileError || eventsError || !profile?.referral_code) {
    return NextResponse.json({ error: 'Referral information unavailable' }, { status: 503 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const inviteUrl = new URL('/', siteUrl);
  inviteUrl.searchParams.set('ref', profile.referral_code);
  const invitedCount = count ?? 0;
  return NextResponse.json({
    referralCode: profile.referral_code,
    referralUrl: inviteUrl.toString(),
    invitedCount,
    creditsEarned: invitedCount * 3,
  });
}
