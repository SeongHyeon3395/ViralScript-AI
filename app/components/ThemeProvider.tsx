'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from './AuthProvider';

type ThemePreference = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: 'dark' | 'light';
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: ThemePreference): 'dark' | 'light' {
  if (preference !== 'system') return preference;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const saved = window.localStorage.getItem('viralscript-theme') as ThemePreference | null;
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      setPreferenceState(saved);
      setTheme(resolveTheme(saved));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getSupabaseBrowserClient()
      .from('profiles')
      .select('theme_preference')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const profile = data as { theme_preference?: unknown } | null;
        const saved = profile?.theme_preference as ThemePreference | undefined;
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          setPreferenceState(saved);
          setTheme(resolveTheme(saved));
          window.localStorage.setItem('viralscript-theme', saved);
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const next = (event as CustomEvent<ThemePreference>).detail;
      if (next === 'dark' || next === 'light' || next === 'system') {
        setPreferenceState(next);
        setTheme(resolveTheme(next));
      }
    };
    window.addEventListener('viralscript-theme-change', handleThemeChange);
    return () => window.removeEventListener('viralscript-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    setTheme(resolveTheme(next));
    window.localStorage.setItem('viralscript-theme', next);
    window.dispatchEvent(new CustomEvent('viralscript-theme-change', { detail: next }));
  }

  return <ThemeContext.Provider value={{ theme, preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}