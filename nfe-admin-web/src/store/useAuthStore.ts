import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  initialize: async () => {
    // 1. Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // 2. Fetch profile if we have a user
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      set({ session, user: session.user, profile: profile || null, isLoading: false });
    } else {
      set({ session: null, user: null, profile: null, isLoading: false });
    }

    // 3. Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', newSession.user.id)
          .single();
        set({ session: newSession, user: newSession.user, profile: profile || null });
      } else {
        set({ session: null, user: null, profile: null });
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  }
}));
