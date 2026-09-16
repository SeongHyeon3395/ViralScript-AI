import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * The current browser AdSense integration has no server-side verification, signed reward
 * payload, or unique provider event id. A client "rewarded" callback is therefore never proof
 * of an ad view. Keep this endpoint closed until a provider-specific SSV verifier is added.
 */
function rewardUnavailable(): NextResponse {
  return NextResponse.json({
    error: 'Ad rewards are disabled until server-side provider verification is configured.',
    code: 'ADS_REWARD_VERIFICATION_UNAVAILABLE',
  }, { status: 503 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void req;
  return rewardUnavailable();
}
