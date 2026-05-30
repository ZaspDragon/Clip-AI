"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getBrowserSupabase } from "@/lib/temptrack-supabase-browser";
import type { Agency, UserProfile } from "@/lib/temptrack-types";

type AuthContextValue = {
  supabaseReady: boolean;
  session: Session | null;
  profile: UserProfile | null;
  agency: Agency | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function sleep(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (!supabase) {
      return;
    }

    if (!nextSession?.user) {
      setSession(null);
      setProfile(null);
      setAgency(null);
      setProfileError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSession(nextSession);

    let loadedProfile: UserProfile | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", nextSession.user.id)
        .maybeSingle<UserProfile>();

      if (error) {
        lastError = error.message;
        console.error("Failed to load user profile", error);
        break;
      }

      if (data) {
        loadedProfile = data;
        break;
      }

      await sleep(400);
    }

    if (!loadedProfile) {
      setProfile(null);
      setAgency(null);
      setProfileError(lastError ?? "Your profile is still being created. Refresh in a moment.");
      setLoading(false);
      return;
    }

    setProfile(loadedProfile);
    setProfileError(null);

    if (loadedProfile.agency_id) {
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", loadedProfile.agency_id)
        .maybeSingle<Agency>();

      if (agencyError) {
        console.error("Failed to load agency", agencyError);
      }

      setAgency(agencyData ?? null);
    } else {
      setAgency(null);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      void loadProfile(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadProfile(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, supabase]);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile, supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setAgency(null);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabaseReady: Boolean(supabase),
      session,
      profile,
      agency,
      loading,
      profileError,
      refreshProfile,
      signOut,
    }),
    [agency, loading, profile, profileError, refreshProfile, session, signOut, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
