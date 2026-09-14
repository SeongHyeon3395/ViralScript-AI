'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const PROFILE_CACHE_TTL_MS = 30_000;
type ProfileSnapshot = { credits: number; language: 'ko' | 'en' | 'ja' | 'zh' };
const profileCache = new Map<string, { value: ProfileSnapshot; expiresAt: number }>();
const profileRequests = new Map<string, Promise<ProfileSnapshot>>();

async function fetchProfileSnapshot(): Promise<ProfileSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user.id) {
    throw new Error('No authenticated session');
  }

  const cached = profileCache.get(session.user.id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const existingRequest = profileRequests.get(session.user.id);
  if (existingRequest) return existingRequest;

  // The user's own profile is readable under RLS; selecting both values avoids
  // separate profile API round trips during login and language restoration.
  const request = Promise.resolve(supabase.from('profiles')
    .select('credits_remaining, default_language')
    .eq('id', session.user.id)
    .single())
    .then(({ data, error }) => {
      const profile = data as unknown as { credits_remaining: number; default_language: string | null } | null;
      if (error || !profile || typeof profile.credits_remaining !== 'number') {
        throw error ?? new Error('Profile returned an invalid credit balance');
      }
      const language: ProfileSnapshot['language'] = profile.default_language === 'ko' || profile.default_language === 'ja' || profile.default_language === 'zh'
        ? profile.default_language : 'en';
      const snapshot = { credits: profile.credits_remaining, language };
      profileCache.set(session.user.id, { value: snapshot, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      return snapshot;
    })
    .finally(() => profileRequests.delete(session.user.id));

  profileRequests.set(session.user.id, request);
  return request;
}

export async function fetchUserCredits(): Promise<number> {
  return (await fetchProfileSnapshot()).credits;
}

export function clearUserCreditsCache() {
  profileCache.clear();
}

export async function fetchUserLanguage(): Promise<'ko' | 'en' | 'ja' | 'zh'> {
  return (await fetchProfileSnapshot()).language;
}
