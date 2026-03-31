"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, SupabaseClient } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  usageCount: number | null;
  refreshUsage: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  usageCount: null,
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
  const supabase = useMemo<SupabaseClient | null>(
    () => (supabaseConfigured ? createClient() : null),
    []
  );

  const refreshUsage = useCallback(async () => {
    if (!user || !supabase) {
      setUsageCount(null);
      return;
    }
    const { count } = await supabase
      .from("usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setUsageCount(count ?? 0);
  }, [user, supabase]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  return (
    <AuthCtx.Provider value={{ user, loading, usageCount, refreshUsage }}>
      {children}
    </AuthCtx.Provider>
  );
}
