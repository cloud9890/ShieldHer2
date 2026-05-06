// src/hooks/useAuth.js
// Custom hook for Supabase auth state + profile data
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../api/supabase";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) { setProfile(null); return; }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      setProfile(data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) loadProfile(u);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) loadProfile(u);
        else setProfile(null);
      }
    );
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = () => { if (user) loadProfile(user); };

  return { user, profile, loading, refreshProfile };
}
