import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const { data, error, count } = await supabase
    .from('user_generation_history')
    .select('id, source_url, project_title, target_product_name, credits_used, created_at', {
      count: 'exact',
    })
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, limit, offset });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
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

  const { searchParams } = new URL(req.url);
  const historyId = searchParams.get('id');

  if (!historyId) {
    return NextResponse.json({ error: 'history id is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_generation_history')
    .delete()
    .eq('id', historyId)
    .eq('user_id', userData.user.id); // RLS 보강: 본인 데이터만 삭제

  if (error) {
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
