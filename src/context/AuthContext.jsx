import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, withTimeout } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        10000,
        "Loading profile"
      );
      if (error) {
        console.error("[Auth] loadProfile error:", error.message);
        setProfile(null);
        return null;
      }
      setProfile(data);
      return data;
    } catch (err) {
      console.error("[Auth] loadProfile exception:", err);
      setProfile(null);
      return null;
    }
  }, []);

  // Initial session load + auth state subscription. The two key invariants:
  //   1. setLoading(false) ALWAYS runs (even on timeout/error)
  //   2. loadProfile() never blocks the auth path — it's fire-and-forget so a
  //      slow/failing profiles query can't freeze the whole UI.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          "Reading session"
        );
        if (error) console.error("[Auth] getSession error:", error.message);
        const initialSession = data?.session ?? null;
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          // fire-and-forget so a slow profile fetch can't gate the whole app
          loadProfile(initialSession.user.id);
        }
      } catch (err) {
        console.error("[Auth] init failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async ({ email, password }) => {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      15000,
      "Sign in"
    );
    if (error) throw error;
    return data;
  };

  const signUp = async ({ email, password, fullName, phone, role = "tenant" }) => {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role,
          },
        },
      }),
      15000,
      "Sign up"
    );
    if (error) throw error;

    const newUser = data.user;
    if (newUser) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: newUser.id,
          email,
          full_name: fullName,
          phone,
          role,
        },
        { onConflict: "id" }
      );
      if (profileError) {
        console.error("[Auth] profile upsert failed:", profileError.message);
      }
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user?.id) await loadProfile(user.id);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
