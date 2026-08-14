'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function fetchUserCredits(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authenticated session');
  }

  const res = await fetch('/api/v1/profile', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    throw new Error(`Profile API failed: ${res.status}`);
  }

  const payload = await res.json() as { data?: { credits_remaining?: number } };
  const credits = payload.data?.credits_remaining;
  if (typeof credits !== 'number') {
    throw new Error('Profile API returned an invalid credit balance');
  }
  return credits;
}