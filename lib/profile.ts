'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const PROFILE_CACHE_TTL_MS = 30_000;
const creditsCache = new Map<string, { value: number; expiresAt: number }>();
const creditsRequests = new Map<string, Promise<number>>();

export async function fetchUserCredits(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user.id) {
    throw new Error('No authenticated session');
  }

  const cached = creditsCache.get(session.user.id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const existingRequest = creditsRequests.get(session.user.id);
  if (existingRequest) return existingRequest;

  const request = fetch('/api/v1/profile', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Profile API failed: ${res.status}`);

      const payload = await res.json() as { data?: { credits_remaining?: number } };
      const credits = payload.data?.credits_remaining;
      if (typeof credits !== 'number') {
        throw new Error('Profile API returned an invalid credit balance');
      }

      creditsCache.set(session.user.id, { value: credits, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      return credits;
    })
    .finally(() => creditsRequests.delete(session.user.id));

  creditsRequests.set(session.user.id, request);
  return request;
}

export function clearUserCreditsCache() {
  creditsCache.clear();
}