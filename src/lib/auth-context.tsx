import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        setProfile(null);
        setLoading(false);
      }
    }).catch(() => {
      setProfile(null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'TOKEN_REFRESHED') return;
      if (event === 'INITIAL_SESSION') return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setSession(sess);
        setLoading(false);
        return;
      }

      setSession(sess);
      if (!sess) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Safety: never stay stuck on loading
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!session || isPasswordRecovery) {
      if (!isPasswordRecovery) {
        setProfile(null);
        setLoading(false);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!cancelled) {
        if (data) setProfile(data as Profile);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session, isPasswordRecovery]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, isPasswordRecovery, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
