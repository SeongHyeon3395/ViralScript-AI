import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// ─── GET /auth/callback ───────────────────────────────────────
// Supabase 이메일 인증 링크 클릭 시 PKCE 코드 검증 및 세션 생성
// signup, recovery, login 등 모든 인증 flow가 이 콜백을 통해 처리됩니다.
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

  // type이 recovery면 비밀번호 재설정, signup/email은 일반 인증 완료 → /?auth=confirmed
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/?password_reset=success`);
  }

  // 이메일 인증 완료 → 대본 생성 페이지로 리디렉트
  return NextResponse.redirect(`${origin}/?auth=confirmed`);
}