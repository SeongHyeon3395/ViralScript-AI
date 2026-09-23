import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { SITE_MAINTENANCE_COPY, SITE_MAINTENANCE_MODES, type SiteMaintenanceMode } from '@/lib/siteMaintenance';

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
  const path = req.nextUrl.pathname;
  const isControlRoute = path === '/Master' || path.startsWith('/Master/') || path === '/api/master' || path.startsWith('/api/master/');
  const isOperationalRoute = path.startsWith('/api/cron/') || path.startsWith('/api/webhooks/');
  const isPublicInfoRoute = ['/privacy', '/terms', '/ads.txt', '/robots.txt', '/sitemap.xml'].includes(path);
  const isStaticAsset = path.startsWith('/_next/') || path.startsWith('/favicon') || /\.[a-zA-Z0-9]{2,5}$/.test(path);

  if (!isControlRoute && !isOperationalRoute && !isPublicInfoRoute && !isStaticAsset) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      try {
        const response = await fetch(
          `${supabaseUrl.replace(/\/$/, '')}/rest/v1/site_settings?select=maintenance_mode&id=eq.true&limit=1`,
          {
            headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
            cache: 'no-store',
            signal: AbortSignal.timeout(2500),
          },
        );
        if (!response.ok) throw new Error(`Maintenance status lookup returned ${response.status}`);
        const rows = await response.json() as Array<{ maintenance_mode?: string | null }>;
        const rawMode = rows[0]?.maintenance_mode;
        const mode = SITE_MAINTENANCE_MODES.includes(rawMode as SiteMaintenanceMode) ? rawMode as SiteMaintenanceMode : null;

        if (mode) {
          const languageHeader = req.headers.get('accept-language')?.toLowerCase() ?? '';
          const language: 'ko' | 'en' | 'ja' | 'zh' = languageHeader.includes('ko') ? 'ko'
            : languageHeader.includes('ja') ? 'ja'
              : languageHeader.includes('zh') ? 'zh' : 'en';
          const { title, message } = SITE_MAINTENANCE_COPY[mode][language];
          const isApi = path.startsWith('/api/');
          if (isApi) {
            return NextResponse.json(
              { errorCode: 'SITE_MAINTENANCE', mode, message },
              { status: 503, headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' } },
            );
          }

          const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} — ViralScript AI</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#080910;color:#f5f3ff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.card{max-width:560px;text-align:center;padding:42px 32px;border:1px solid #ffffff20;border-radius:24px;background:#ffffff08}.mark{font-size:12px;letter-spacing:.2em;color:#c4b5fd;font-weight:800}.icon{font-size:40px;margin:28px 0 12px}h1{font-size:clamp(24px,5vw,34px);margin:0 0 14px}p{color:#c4c1d2;line-height:1.8;margin:0}</style></head><body><main class="card"><div class="mark">VIRALSCRIPT AI</div><div class="icon" aria-hidden="true">🛠️</div><h1>${title}</h1><p>${message}</p></main></body></html>`;
          return new NextResponse(html, {
            status: 503,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store, max-age=0',
              'Retry-After': '300',
              'X-Robots-Tag': 'noindex, nofollow',
            },
          });
        }
      } catch (error) {
        console.error('[site-maintenance] Status lookup failed', error);
        const isApi = path.startsWith('/api/');
        if (isApi) {
          return NextResponse.json(
            { errorCode: 'SITE_STATUS_UNAVAILABLE', error: '서비스 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.' },
            { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
          );
        }
        return new NextResponse('ViralScript AI is temporarily unavailable. Please try again shortly.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '60' },
        });
      }
    }
  }

  // analyze 엔드포인트에만 Rate Limiting 적용
  if (path.startsWith('/api/v1/analyze')) {
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
  matcher: '/:path*',
};
