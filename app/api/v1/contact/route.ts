import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const CATEGORIES = ['account', 'billing', 'generation', 'bug', 'feature', 'other', 'suspension_appeal'] as const;
type ContactCategory = typeof CATEGORIES[number];

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = request.headers.get('authorization');
    const body = await request.json() as { category?: unknown; message?: unknown; appealEmail?: unknown };
    if (!CATEGORIES.includes(body.category as ContactCategory)) return error('Please select an inquiry category.', 400);
    if (typeof body.message !== 'string') return error('Please enter your inquiry.', 400);
    const message = body.message.trim();
    if (message.length < 10 || message.length > 5_000) return error('Your inquiry must be between 10 and 5,000 characters.', 400);

    const supabase = createAdminClient();
    let userId: string;
    let senderEmail: string;
    if (body.category === 'suspension_appeal') {
      const appealEmail = typeof body.appealEmail === 'string' ? body.appealEmail.trim().toLowerCase() : '';
      if (!/^\S+@\S+\.\S+$/.test(appealEmail)) return error('Enter the email address for the suspended account.', 400);
      const { data: suspendedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, is_suspended')
        .eq('email', appealEmail)
        .eq('is_suspended', true)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!suspendedProfile) return error('This appeal cannot be submitted for that account.', 403);
      userId = suspendedProfile.id;
      senderEmail = suspendedProfile.email;
    } else {
      if (!authorization?.startsWith('Bearer ')) return error('Please sign in before sending an inquiry.', 401);
      const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7));
      if (authError || !authData.user?.email) return error('Your session has expired. Please sign in again.', 401);
      const { data: profile, error: profileError } = await supabase.from('profiles').select('is_suspended').eq('id', authData.user.id).maybeSingle();
      if (profileError) throw profileError;
      if (profile?.is_suspended) return error('Suspended accounts can submit an appeal only.', 403);
      userId = authData.user.id;
      senderEmail = authData.user.email;
    }

    const { count, error: countError } = await supabase
      .from('support_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (countError) throw countError;
    if ((count ?? 0) >= 5) return error('You can send up to five inquiries per hour. Please try again later.', 429);

    const { error: insertError } = await supabase.from('support_inquiries').insert({
      user_id: userId,
      sender_email: senderEmail,
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
