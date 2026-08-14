import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createAdminClient();

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = userData.user;

  const { error: upsertError } = await supabase.from('profiles').upsert(
    { id: user.id, email: user.email ?? '' } as never,
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (upsertError) {
    console.warn('[profile] profile upsert failed:', upsertError.message);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, email, subscription_plan, credits_remaining, stripe_customer_id, created_at, updated_at'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json({ data: profile });
}
