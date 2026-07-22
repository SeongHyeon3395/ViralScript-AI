/**
 * 공통 Base URL 헬퍼
 * 
 * - 클라이언트 사이드: 상대 경로 사용 (return '')
 * - 서버 사이드: NEXT_PUBLIC_APP_URL > VERCEL_URL > 프로덕션 fallback 순서
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return ''; // 브라우저에서는 상대 경로
  }

  // Vercel 서버사이드 우선순위
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // 프로덕션 fallback
  return 'https://viralscript-ai-inky.vercel.app';
}

/**
 * fetch() 래퍼 — 클라이언트/서버 관계없이 동일한 인터페이스로 API 호출
 */
export async function apiFetch(
  path: string,
  options?: RequestInit & { baseUrl?: string },
): Promise<Response> {
  const base = options?.baseUrl ?? getBaseUrl();
  const url = `${base}${path}`;
  return fetch(url, options);
}
