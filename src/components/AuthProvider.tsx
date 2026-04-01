"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  usageCount: number | null;
  isAdmin: boolean;
  refreshUsage: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  usageCount: null,
  isAdmin: false,
  refreshUsage: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = useMemo<SupabaseClient | null>(
    () => (supabaseConfigured ? createClient() : null),
    []
  );

  const userId = user?.id;

  // Fetch admin status from server (avoids leaking admin emails in client bundle)
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [userId]);

  const refreshUsage = useCallback(async () => {
    if (!userId || !supabase || isAdmin) {
      setUsageCount(null);
      return;
    }
    const { count } = await supabase
      .from("usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    setUsageCount(count ?? 0);
  }, [userId, supabase, isAdmin]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      // Only update if the user actually changed — prevents cascading
      // re-renders and re-fetches on token refresh events
      setUser((prev) => (prev?.id === newUser?.id ? prev : newUser));
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  return (
    <AuthCtx.Provider value={{ user, loading, usageCount, isAdmin, refreshUsage }}>
      {children}
    </AuthCtx.Provider>
  );
}
