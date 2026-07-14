import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Upstash Redis 기반 슬라이딩 윈도우 Rate Limiter
// 분당 최대 10회 요청 (IP 기반)
let ratelimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  // 환경변수가 없으면 (로컬 개발 환경 등) Rate Limiting 비활성화
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'viral_rl',
    });
  }

  return ratelimit;
}

// Next.js 16: 함수명은 반드시 `proxy`여야 합니다 (middleware → proxy 변경)
export async function proxy(req: NextRequest): Promise<NextResponse> {
  // analyze 엔드포인트에만 Rate Limiting 적용
  if (req.nextUrl.pathname.startsWith('/api/v1/analyze')) {
    const limiter = getRateLimiter();

    if (limiter) {
      // IP 우선순위: Vercel Edge IP → X-Forwarded-For → fallback
      const ip =
        req.headers.get('x-real-ip') ??
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        '127.0.0.1';

      const { success, limit, reset, remaining } = await limiter.limit(`ratelimit_${ip}`);

      if (!success) {
        return NextResponse.json(
          {
            success: false,
            error: 'API 호출 한도를 초과했습니다. 1분 후 다시 시도하십시오.',
            errorCode: 'TOO_MANY_REQUESTS',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(reset),
              'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            },
          }
        );
      }

      const res = NextResponse.next();
      res.headers.set('X-RateLimit-Limit', String(limit));
      res.headers.set('X-RateLimit-Remaining', String(remaining));
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/v1/analyze/:path*',
};
