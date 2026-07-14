'use client';

import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;

/**
 * 브라우저 클라이언트 사이드 Supabase 인스턴스 (싱글톤)
 * Anon Key만 사용하며 RLS 정책이 완전히 적용됩니다.
 */
export function getSupabaseBrowserClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase public credentials are not configured.');
  }

  _client = createClient(url, anonKey);
  return _client;
}
