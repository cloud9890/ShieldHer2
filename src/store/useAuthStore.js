import { create } from 'zustand';
import { supabase } from '../api/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  isInitialized: false,
  unsubAuth: null,

  profileLoadUserId: null,

  loadProfileIfNeeded: (u) => {
    if (!u) {
      set({ profile: null, profileLoadUserId: null });
      return;
    }
    if (get().profileLoadUserId !== u.id) {
      set({ profileLoadUserId: u.id });
      get().loadProfile(u);
    }
  },

  loadProfile: async (authUser) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      set({ profile: data || { name: 'New User', phone: '' } });
    } catch (_) {
      set({ profile: { name: 'New User', phone: '' } });
    }
  },

  initAuth: () => {
    if (get().isInitialized) return; 
    set({ isInitialized: true });

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      set({ user: u || null, loading: false });
      get().loadProfileIfNeeded(u);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        set({ user: u });
        get().loadProfileIfNeeded(u);
      }
    );
    
    set({ unsubAuth: subscription.unsubscribe });
  },

  stopAuth: () => {
    const { unsubAuth } = get();
    if (unsubAuth) {
      unsubAuth();
      set({ unsubAuth: null, isInitialized: false });
    }
  },

  refreshProfile: () => {
    const { user, loadProfile } = get();
    if (user) loadProfile(user);
  }
}));

export default useAuthStore;
