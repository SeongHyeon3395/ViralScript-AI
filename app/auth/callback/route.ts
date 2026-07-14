import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// ─── GET /auth/callback ───────────────────────────────────────
// Supabase 이메일 인증 링크 클릭 시 리디렉션되는 콜백 핸들러
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type') ?? 'signup';

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] 코드 교환 실패:', error.message);
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`);
    }
  }

  // type이 recovery면 비밀번호 재설정, 아니면 일반 로그인 완료
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/?password_reset=success`);
  }

  return NextResponse.redirect(`${origin}/?auth=confirmed`);
}