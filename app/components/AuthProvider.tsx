'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { clearUserCreditsCache, fetchUserCredits, fetchUserLanguage } from '@/lib/profile';

interface AuthContextValue {
  user: SupabaseUser | null;
  isLoading: boolean;
  credits: number | undefined;
  refreshCredits: () => Promise<void>;
  applyCreditsFromServer: (credits: number) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000;
const SESSION_TIMESTAMP_KEY = 'auth_login_at';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const requestIdRef = useRef(0);
  const userRef = useRef<SupabaseUser | null>(null);
  const expiryAlertShownRef = useRef(false);

  const clearSessionTimestamp = useCallback(() => {
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  }, []);

  const setSessionTimestamp = useCallback(() => {
    if (localStorage.getItem(SESSION_TIMESTAMP_KEY)) return;
    const now = Date.now();
    localStorage.setItem(SESSION_TIMESTAMP_KEY, String(now));
  }, []);

  const triggerSessionKillSwitch = useCallback(async () => {
    if (expiryAlertShownRef.current) return;
    expiryAlertShownRef.current = true;
    const supabase = getSupabaseBrowserClient();
    window.alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
    clearSessionTimestamp();
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      userRef.current = null;
      setCredits(undefined);
    }
  }, [clearSessionTimestamp]);

  const refreshCredits = useCallback(async () => {
    const activeUser = userRef.current;
    if (!activeUser) {
      setCredits(undefined);
      return;
    }

    const requestId = ++requestIdRef.current;
    try {
      clearUserCreditsCache();
      let nextCredits: number | null = null;
      for (let attempt = 0; attempt < 3 && nextCredits === null; attempt += 1) {
        try {
          nextCredits = await fetchUserCredits();
        } catch {
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
      if (nextCredits === null) return;
      if (requestId === requestIdRef.current && userRef.current?.id === activeUser.id) {
        setCredits(nextCredits);
      }
    } catch {
      // Keep the last known balance when a refresh temporarily fails.
    }
  }, []);

  const applyCreditsFromServer = useCallback((nextCredits: number) => {
    if (!Number.isFinite(nextCredits) || nextCredits < 0) return;
    requestIdRef.current += 1;
    clearUserCreditsCache();
    setCredits(nextCredits);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;
    let sessionResolved = false;
    let authEventResolved = false;

    const finishLoading = () => {
      if (mounted && sessionResolved && authEventResolved) setIsLoading(false);
    };

    const applySession = (nextUser: SupabaseUser | null) => {
      if (!mounted) return;
      userRef.current = nextUser;
      setUser(nextUser);
      if (!nextUser) {
        requestIdRef.current += 1;
        setCredits(undefined);
        clearUserCreditsCache();
        clearSessionTimestamp();
      } else {
        setSessionTimestamp();
        // Supabase auth callbacks must not call another auth method synchronously.
        window.setTimeout(() => {
          void refreshCredits();
          void fetchUserLanguage().then((language) => {
            window.localStorage.setItem('viralLang', language);
            window.dispatchEvent(new CustomEvent('language:changed', { detail: language }));
          }).catch(() => {
            // 언어 조회가 실패해도 인증 상태와 크레딧 처리는 계속합니다.
          });
        }, 0);
      }
    };

    const checkSessionTimeout = async () => {
      const storedAt = Number(localStorage.getItem(SESSION_TIMESTAMP_KEY));
      const now = Date.now();

      if (storedAt && Number.isFinite(storedAt) && now - storedAt >= SESSION_TIMEOUT_MS) {
        await triggerSessionKillSwitch();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      applySession(nextUser);
      authEventResolved = true;
      finishLoading();
    });

    void supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session?.user ?? null))
      .catch(() => applySession(null))
      .finally(() => {
        sessionResolved = true;
        finishLoading();
      });

    void checkSessionTimeout();
    const timer = window.setInterval(() => {
      void checkSessionTimeout();
    }, 60_000);

    const handleCreditsUpdated = () => {
      void refreshCredits();
    };
    window.addEventListener('credits:updated', handleCreditsUpdated);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('credits:updated', handleCreditsUpdated);
      window.clearInterval(timer);
    };
  }, [clearSessionTimestamp, refreshCredits, setSessionTimestamp, triggerSessionKillSwitch]);

  return (
    <AuthContext.Provider value={{ user, isLoading, credits, refreshCredits, applyCreditsFromServer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
