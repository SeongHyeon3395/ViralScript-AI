'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { setTranslationLanguage } from './LanguageSwitcher';

export type AppLanguage = 'en' | 'ko' | 'ja' | 'zh';
const STORAGE_KEY = 'viralLang';
const validLanguage = (value: unknown): value is AppLanguage => value === 'en' || value === 'ko' || value === 'ja' || value === 'zh';

type LanguageContextValue = { language: AppLanguage; setLanguage: (language: AppLanguage) => Promise<void> };
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // English is deliberately also the SSR value and translation fallback.
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initialTimer = window.setTimeout(() => {
      if (validLanguage(stored)) {
        setTranslationLanguage(stored);
        setLanguageState(stored);
      }
    }, 0);
    const restore = (event: Event) => {
      const next = (event as CustomEvent<unknown>).detail;
      if (validLanguage(next)) {
        setTranslationLanguage(next);
        setLanguageState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    };
    window.addEventListener('language:changed', restore);
    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener('language:changed', restore);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    if (!validLanguage(next)) return;
    setTranslationLanguage(next);
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent('language:changed', { detail: next }));
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch('/api/v1/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ defaultLanguage: next }),
    });
    if (!response.ok) throw new Error('LANGUAGE_UPDATE_FAILED');
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
