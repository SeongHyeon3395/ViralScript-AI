import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

function digest(value: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Email recovery secret is unavailable.');
  return createHmac('sha256', secret).update(value).digest('hex');
}

function requesterAddress(req: NextRequest): string {
  return (req.headers.get('x-vercel-forwarded-for')
    ?? req.headers.get('x-forwarded-for')
    ?? req.headers.get('x-real-ip')
    ?? 'unknown').split(',')[0].trim();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (Number(req.headers.get('content-length') ?? 0) > 4_096) {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 413 });
  }

  let body: { fullName?: unknown; phoneCountryCode?: unknown; phoneNumber?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 400 });
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 100) : '';
  const phoneCountryCode = typeof body.phoneCountryCode === 'string' ? body.phoneCountryCode.trim() : '';
  const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.replace(/[^0-9]/g, '') : '';
  if (!fullName || !/^\+[0-9]{1,4}$/.test(phoneCountryCode) || !/^[0-9]{6,20}$/.test(phoneNumber)) {
    return NextResponse.json({ errorCode: 'INVALID_REQUEST' }, { status: 400 });
  }

  const requesterHash = digest(`requester:${requesterAddress(req)}`);
  const lookupHash = digest(`lookup:${fullName.toLocaleLowerCase('en-US')}|${phoneCountryCode}|${phoneNumber}`);
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('find_email_by_phone_server', {
    p_full_name: fullName,
    p_phone_country_code: phoneCountryCode,
    p_phone_number: phoneNumber,
    p_requester_hash: requesterHash,
    p_lookup_hash: lookupHash,
  } as never) as { data: Array<{ masked_email: string }> | null; error: { message: string } | null };

  if (error?.message.includes('EMAIL_RECOVERY_RATE_LIMITED')) {
    return NextResponse.json({ errorCode: 'RATE_LIMITED' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
  }
  if (error) {
    console.error('[find-email] recovery lookup failed:', error.message);
    return NextResponse.json({ errorCode: 'RECOVERY_FAILED' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(
    { maskedEmail: data?.[0]?.masked_email ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
