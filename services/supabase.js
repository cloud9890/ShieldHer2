// services/supabase.js
// NOTE: react-native-url-polyfill/auto is imported in index.js (must be first)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://fklkcolgqaglrzukoslz.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbGtjb2xncWFnbHJ6dWtvc2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjE2MjIsImV4cCI6MjA5MDMzNzYyMn0.tqDS0SXcxNFaCN3jyV--tNlL9ptuiCLvk6ZiYJQuIg4";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // Explicit headers help Android not drop connections silently
    headers: { 'X-Client-Info': 'shieldher-rn' },
  },
});
