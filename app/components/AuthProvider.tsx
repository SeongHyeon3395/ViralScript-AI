'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchUserCredits } from '@/lib/profile';

interface AuthContextValue {
  user: SupabaseUser | null;
  isLoading: boolean;
  credits: number | undefined;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const SESSION_TIMEOUT_MS = 43_200_000;
const SESSION_TIMESTAMP_KEY = 'video_maker_session_started_at';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const requestIdRef = useRef(0);
  const userRef = useRef<SupabaseUser | null>(null);

  const clearSessionTimestamp = useCallback(() => {
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  }, []);

  const setSessionTimestamp = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(SESSION_TIMESTAMP_KEY, String(now));
    console.log('[auth] session timestamp stored', { now, expiresAt: now + SESSION_TIMEOUT_MS });
  }, []);

  const triggerSessionKillSwitch = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    console.warn('[auth] session expired: 12h timeout reached, signing out now');
    clearSessionTimestamp();
    await supabase.auth.signOut();
    setUser(null);
    userRef.current = null;
    setCredits(undefined);
  }, [clearSessionTimestamp]);

  const refreshCredits = useCallback(async () => {
    const activeUser = userRef.current;
    if (!activeUser) {
      setCredits(undefined);
      return;
    }

    const requestId = ++requestIdRef.current;
    try {
      const nextCredits = await fetchUserCredits();
      if (requestId === requestIdRef.current && userRef.current?.id === activeUser.id) {
        setCredits(nextCredits);
      }
    } catch {
      // Keep the last known balance when a refresh temporarily fails.
    }
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
        clearSessionTimestamp();
        console.log('[auth] user signed out / session cleared');
      } else {
        setSessionTimestamp();
        void refreshCredits();
      }
    };

    const checkSessionTimeout = async () => {
      const storedAt = Number(localStorage.getItem(SESSION_TIMESTAMP_KEY));
      const now = Date.now();
      console.log('[auth] timeout check', { storedAt, now, elapsed: storedAt ? now - storedAt : null, limit: SESSION_TIMEOUT_MS });

      if (userRef.current && storedAt && now - storedAt > SESSION_TIMEOUT_MS) {
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
    <AuthContext.Provider value={{ user, isLoading, credits, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
