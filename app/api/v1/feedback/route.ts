import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: { generationId?: string; rating?: number; wouldUseAgain?: boolean; comment?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.generationId || !/^[0-9a-f-]{36}$/i.test(body.generationId) || !Number.isInteger(body.rating) || body.rating! < 1 || body.rating! > 5 || typeof body.wouldUseAgain !== 'boolean' || typeof body.comment !== 'string' || body.comment.trim().length < 30 || body.comment.length > 4000) {
    return NextResponse.json({ error: 'Feedback must include a 1-5 rating and at least 30 characters.' }, { status: 400 });
  }
  const { data, error } = await supabase.rpc('submit_generation_feedback', {
    p_user_id: auth.user.id, p_generation_id: body.generationId, p_rating: body.rating,
    p_would_use_again: body.wouldUseAgain, p_comment: body.comment,
  });
  if (error) {
    if (error.message.includes('FEEDBACK_ALREADY_SUBMITTED')) return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 });
    if (error.message.includes('GENERATION_NOT_FOUND')) return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 });
  }
  return NextResponse.json({ success: true, creditsRemaining: data });
}
