// src/hooks/useCommunityReports.js
// Custom hook for community safety reports — Supabase-backed with Realtime
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../api/supabase";

export default function useCommunityReports(limit = 50) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!error && data) setReports(data);
    } catch (_) {}
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();

    // Realtime subscription for live map updates
    const channel = supabase
      .channel("community_reports_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_reports" },
        (payload) => {
          setReports((prev) => [payload.new, ...prev].slice(0, limit));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_reports" },
        (payload) => {
          setReports((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, limit]);

  const submitReport = async ({ category, note, lat, lng }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("community_reports")
        .insert({ user_id: user.id, category, note, lat, lng })
        .select()
        .single();
      if (error) throw error;
      // Realtime will add it, but add optimistically too
      setReports((prev) => [data, ...prev]);
      return data;
    } catch (e) {
      console.error("submitReport:", e.message);
      return null;
    }
  };

  const deleteReport = async (id) => {
    try {
      await supabase.from("community_reports").delete().eq("id", id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (_) {}
  };

  return { reports, loading, submitReport, deleteReport, reload: load };
}
