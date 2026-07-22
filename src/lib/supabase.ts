import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * The whole app runs without a backend. A clean clone with no `.env.local`
 * shows the site with demo content, disables anything that would write, and
 * says so where it matters — rather than throwing on boot or, worse, rendering
 * a dead sign-in form that silently does nothing.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Narrowing helper for call sites that must have a client. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

/**
 * Postgres errors arrive with codes rather than sentences. Map the ones the
 * lifecycle functions raise onto something a person can act on; anything else
 * falls back to the raised message, which those functions write in plain
 * English on purpose.
 */
export function readableError(error: unknown): string {
  if (!error) return '';
  const e = error as { code?: string; message?: string };

  switch (e.code) {
    case '42501':
      return e.message ?? 'You do not have permission to do that.';
    case 'P0002':
      return e.message ?? 'That record no longer exists.';
    case '23505':
      return 'That already exists.';
    case 'PGRST301':
      return 'Your session expired. Sign in again.';
    default:
      return e.message ?? 'Something went wrong.';
  }
}
