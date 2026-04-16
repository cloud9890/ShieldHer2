// src/hooks/useContacts.js
// SafeCircle contact management — Supabase-backed (survives reinstalls)
// Falls back to AsyncStorage cache for offline resilience.
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";

const CACHE_KEY = "shieldher_contacts_cache";

export default function useContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── Load from Supabase, with AsyncStorage as warm cache ─────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Warm start: show cached contacts immediately
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) setContacts(JSON.parse(cached));

      // 2. Fetch from Supabase (source of truth)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setContacts(data);
        // Update local cache
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Add a contact — writes to Supabase + updates cache ──────────────────
  const addContact = useCallback(async ({ name, phone, relation = "" }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("contacts")
        .insert({ user_id: user.id, name: (name || "").trim(), phone: (phone || "").trim(), relation: (relation || "").trim() })
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => {
        const updated = [...prev, data];
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated)).catch(()=>{});
        return updated;
      });
      return data;
    } catch (e) {
      console.error("addContact:", e.message);
      return null;
    }
  }, []);

  // ── Remove a contact — deletes from Supabase + updates cache ────────────
  const removeContact = useCallback(async (id) => {
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
      setContacts(prev => {
        const updated = prev.filter(c => c.id !== id);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated)).catch(()=>{});
        return updated;
      });
    } catch (e) {
      console.error("removeContact:", e.message);
    }
  }, []);

  return { contacts, loading, addContact, removeContact, reload: load };
}
