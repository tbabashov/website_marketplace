import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/types/db';

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True only for the account with `profiles.is_owner`. Gates the admin desk. */
  isOwner: boolean;

  init: () => () => void;
  /** Push a session straight into the store — used by the OAuth callback so it
   *  never depends on the auth-change event being observed in time. */
  applySession: (session: Session | null) => void;
  refreshProfile: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'azure') => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error?: string; needsVerification?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const NOT_CONFIGURED = 'NOT_CONFIGURED';

/** Where a chosen destination is stashed across an OAuth round-trip. */
export const POST_AUTH_REDIRECT = 'websale.postAuthRedirect';

export const useAuth = create<AuthState>((set, get) => ({
  // Without Supabase the app is immediately "ready" and permanently signed out,
  // which is what lets the marketing pages render on a clean clone.
  ready: !isSupabaseConfigured,
  session: null,
  user: null,
  profile: null,
  isOwner: false,

  init: () => {
    if (!supabase) return () => {};

    void supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true });
      if (data.session) void get().refreshProfile();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, ready: true });
      if (session) {
        void get().refreshProfile();
      } else {
        set({ profile: null, isOwner: false });
      }
    });

    return () => sub.subscription.unsubscribe();
  },

  applySession: (session) => {
    set({ session, user: session?.user ?? null, ready: true });
    if (session) {
      void get().refreshProfile();
    } else {
      set({ profile: null, isOwner: false });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!supabase || !user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle<Profile>();

    if (data) {
      set({ profile: data, isOwner: data.is_owner });
      return;
    }

    // The sign-up trigger normally creates this row. If it is missing (an
    // account made before the trigger existed, say), backfill it rather than
    // leaving the profile page empty.
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split('@')[0] ??
          null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null,
      })
      .select()
      .maybeSingle<Profile>();

    set({ profile: created ?? null, isOwner: created?.is_owner ?? false });
  },

  signInWithProvider: async (provider) => {
    if (!supabase) return { error: NOT_CONFIGURED };

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Microsoft personal + work accounts both land on the same tenant
        // route; asking for email keeps the profile row populated.
        scopes: provider === 'azure' ? 'email openid profile' : undefined,
      },
    });
    return error ? { error: error.message } : {};
  },

  signInWithPassword: async (email, password) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  },

  signUpWithPassword: async (email, password, displayName) => {
    if (!supabase) return { error: NOT_CONFIGURED };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };

    // With email confirmation on, Supabase returns a user but no session.
    return { needsVerification: !data.session };
  },

  sendPasswordReset: async (email) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    return error ? { error: error.message } : {};
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, isOwner: false });
  },
}));

export { NOT_CONFIGURED };
