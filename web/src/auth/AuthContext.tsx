import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { ProfileRow } from '@/lib/types';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: ProfileRow | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; displayName?: string }) => Promise<{ needsEmailConfirmation: boolean }>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const DEV_AUTO_LOGIN_ENABLED = import.meta.env.VITE_DEV_AUTO_LOGIN_ENABLED === 'true';
const DEV_AUTO_LOGIN_EMAIL = (
  import.meta.env.VITE_DEV_AUTO_LOGIN_EMAIL as string | undefined
)?.trim() || 'jondev717@gmail.com';
const DEV_AUTO_LOGIN_PASSWORD = (
  import.meta.env.VITE_DEV_AUTO_LOGIN_PASSWORD as string | undefined
) || 'TestPass123!';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const autoLoginAttemptedRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select('user_id, email, display_name, created_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!isActive) return;
      setProfile((data ?? null) as ProfileRow | null);
    };

    const bootstrapSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isActive) return;

        setSession(data.session);
        if (data.session?.user?.id) {
          try {
            await loadProfile(data.session.user.id);
          } catch (profileErr) {
            // Profile failure must NOT wipe a valid session
            if (isActive) setProfile(null);
            console.warn('[auth] profile load failed (session preserved):', profileErr instanceof Error ? profileErr.message : String(profileErr));
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (!isActive) return;
        // Only clear session for actual auth failures, not AbortError
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn('[auth] bootstrap aborted, preserving state');
        } else {
          setSession(null);
          setProfile(null);
          console.error('[auth] session bootstrap failed:', error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.id) {
        loadProfile(s.user.id).catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (session) return;
    if (!DEV_AUTO_LOGIN_ENABLED) return;
    if (!DEV_AUTO_LOGIN_EMAIL || !DEV_AUTO_LOGIN_PASSWORD) return;
    if (autoLoginAttemptedRef.current) return;
    autoLoginAttemptedRef.current = true;

    supabase.auth.signInWithPassword({
      email: DEV_AUTO_LOGIN_EMAIL,
      password: DEV_AUTO_LOGIN_PASSWORD,
    }).then(({ error }) => {
      if (error) console.error('[auto-login] failed:', error.message);
      else console.log('[auto-login] success');
    });
  }, [loading, session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (params: { email: string; password: string; displayName?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: params.displayName ? { display_name: params.displayName } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return { needsEmailConfirmation: !data.session };
  };

  const resendSignupConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        profile,
        signIn,
        signUp,
        resendSignupConfirmation,
        signOut,
        signInWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
