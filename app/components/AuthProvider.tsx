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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const requestIdRef = useRef(0);
  const userRef = useRef<SupabaseUser | null>(null);

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
      } else {
        void refreshCredits();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
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

    const handleCreditsUpdated = () => {
      void refreshCredits();
    };
    window.addEventListener('credits:updated', handleCreditsUpdated);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('credits:updated', handleCreditsUpdated);
    };
  }, [refreshCredits]);

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
