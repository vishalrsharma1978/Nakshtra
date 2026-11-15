import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  DEFAULT_SETTINGS,
  makeT,
  type AppSettings,
  type Language,
  type Profile,
  type TranslationKey,
} from '@nakshtra/shared';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  settings: AppSettings;
  loading: boolean;
  lang: Language;
  t: (key: TranslationKey) => string;
  refreshProfile: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data as Profile);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('key, value');
    if (data) {
      const merged = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
      for (const row of data) merged[row.key] = row.value;
      setSettings(merged as unknown as AppSettings);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        void loadProfile(data.session.user.id);
        void loadSettings();
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        void loadProfile(newSession.user.id);
        void loadSettings();
      } else {
        setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, loadSettings]);

  // Track last-seen for admin user tracking
  useEffect(() => {
    if (!session) return;
    void supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.user.id);
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const setLanguage = useCallback(
    async (lang: Language) => {
      if (!session) return;
      await supabase.from('profiles').update({ language: lang }).eq('id', session.user.id);
      await loadProfile(session.user.id);
    },
    [session, loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const lang: Language = profile?.language ?? 'en';
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      settings,
      loading,
      lang,
      t: makeT(lang),
      refreshProfile,
      setLanguage,
      signOut,
    }),
    [session, profile, settings, loading, lang, refreshProfile, setLanguage, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
