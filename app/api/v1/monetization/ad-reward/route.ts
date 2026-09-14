import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The current browser AdSense integration has no server-side verification, signed reward
 * payload, or unique provider event id. A client "rewarded" callback is therefore never proof
 * of an ad view. Keep this endpoint closed until a provider-specific SSV verifier is added.
 */
function rewardUnavailable(): NextResponse | null {
  if (process.env.NEXT_PUBLIC_ENABLE_ADS_REWARD !== 'true') {
    return NextResponse.json({ error: 'Ad rewards are disabled.', code: 'ADS_REWARD_FEATURE_DISABLED' }, { status: 403 });
  }
  return NextResponse.json({
    error: 'Ad rewards require server-side provider verification and are not configured.',
    code: 'ADS_REWARD_VERIFICATION_UNAVAILABLE',
  }, { status: 503 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const disabled = rewardUnavailable();
  if (disabled) return disabled;

  // Kept unreachable intentionally. Authenticate before any future verifier is introduced so
  // its contract cannot accidentally trust a client supplied user id.
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await createAdminClient().auth.getUser(authorization.slice(7));
  if (error || !data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ error: 'Ad reward verification is unavailable.' }, { status: 503 });
}
