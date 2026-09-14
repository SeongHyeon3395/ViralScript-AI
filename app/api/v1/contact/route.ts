import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const CATEGORIES = ['account', 'billing', 'generation', 'bug', 'feature', 'other'] as const;
type ContactCategory = typeof CATEGORIES[number];

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return error('Please sign in before sending an inquiry.', 401);

    const body = await request.json() as { category?: unknown; message?: unknown };
    if (!CATEGORIES.includes(body.category as ContactCategory)) return error('Please select an inquiry category.', 400);
    if (typeof body.message !== 'string') return error('Please enter your inquiry.', 400);
    const message = body.message.trim();
    if (message.length < 10 || message.length > 5_000) return error('Your inquiry must be between 10 and 5,000 characters.', 400);

    const supabase = createAdminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !authData.user?.email) return error('Your session has expired. Please sign in again.', 401);

    const { count, error: countError } = await supabase
      .from('support_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authData.user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= 5) return error('You can send up to five inquiries per hour. Please try again later.', 429);

    const { error: insertError } = await supabase.from('support_inquiries').insert({
      user_id: authData.user.id,
      sender_email: authData.user.email,
      category: body.category,
      message,
    });
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (caught) {
    console.error('[contact]', caught instanceof Error ? caught.message : 'Unknown error');
    return error('We could not send your inquiry. Please try again later.', 500);
  }
}
