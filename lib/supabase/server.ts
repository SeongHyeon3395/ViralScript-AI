import { createClient } from '@supabase/supabase-js';

/**
 * Service Role 클라이언트 — 서버 전용 (Route Handler, Server Action)
 * RLS를 우회하므로 절대 클라이언트 사이드에 노출하지 마십시오.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase admin credentials are not configured.');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Anon 클라이언트 — RLS 정책이 적용된 일반 요청용
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public credentials are not configured.');
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
