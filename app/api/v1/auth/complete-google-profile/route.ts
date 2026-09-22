import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ errorCode: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (Number(req.headers.get('content-length') ?? 0) > 4_096) {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 413 });
  }

  const supabase = createAdminClient();
  const { data, error: userError } = await supabase.auth.getUser(authorization.slice(7));
  if (userError || !data.user) {
    return NextResponse.json({ errorCode: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: { phoneCountryCode?: unknown; phoneNumber?: unknown; referralCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 400 });
  }

  const phoneCountryCode = typeof body.phoneCountryCode === 'string' ? body.phoneCountryCode.trim() : '';
  const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.replace(/[^0-9]/g, '') : '';
  const referralCode = typeof body.referralCode === 'string' ? body.referralCode.trim().toUpperCase() : '';
  if (!/^\+[0-9]{1,4}$/.test(phoneCountryCode) || !/^[0-9]{6,20}$/.test(phoneNumber)
      || (referralCode && !/^[A-F0-9]{12}$/.test(referralCode))) {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 400 });
  }

  const { data: credits, error } = await supabase.rpc('complete_google_profile_server', {
    p_user_id: data.user.id,
    p_phone_country_code: phoneCountryCode,
    p_phone_number: phoneNumber,
    p_referral_code: referralCode || null,
  } as never);

  if (error) {
    const errorCode = error.message.includes('REFERRAL') ? 'INVALID_REFERRAL_CODE' : 'PROFILE_SAVE_FAILED';
    console.error('[complete-google-profile] failed:', error.message);
    return NextResponse.json({ errorCode }, { status: 400 });
  }
  return NextResponse.json({ success: true, credits });
}
