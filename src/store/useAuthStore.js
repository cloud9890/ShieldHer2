import { create } from 'zustand';
import { supabase } from '../api/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  isInitialized: false,
  unsubAuth: null,

  loadProfile: async (authUser) => {
    if (!authUser) {
      set({ profile: null });
      return;
    }
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
      if (u) get().loadProfile(u);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        set({ user: u });
        if (u) get().loadProfile(u);
        else set({ profile: null });
      }
    );
    
    set({ unsubAuth: subscription.unsubscribe });
  },

  refreshProfile: () => {
    const { user, loadProfile } = get();
    if (user) loadProfile(user);
  }
}));

export default useAuthStore;
