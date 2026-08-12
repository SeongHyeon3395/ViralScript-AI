'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type CreditsProfile = { credits_remaining: number };

export async function fetchUserCredits(userId: string, email?: string | null): Promise<number> {
  const supabase = getSupabaseBrowserClient();

  const readCredits = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .maybeSingle<CreditsProfile>();

    if (error) {
      console.warn('[profile] credits fetch failed:', error.message);
      return null;
    }

    return data?.credits_remaining ?? 0;
  };

  const credits = await readCredits();
  if (credits !== null) return credits;

  if (!email) return 0;

  const { error: upsertError } = await supabase.from('profiles').upsert(
    { id: userId, email } as never,
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (upsertError) {
    console.warn('[profile] profile creation failed:', upsertError.message);
    return 0;
  }

  return (await readCredits()) ?? 0;
}