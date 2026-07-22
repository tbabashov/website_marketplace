import { create } from 'zustand';

import { demoListings } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';

/**
 * Client-side UI state only. Anything that lives in Postgres is fetched where
 * it is used rather than mirrored here — a second copy of server data is how
 * dashboards start disagreeing with themselves.
 */

interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'bad';
}

interface UIState {
  mobileNavOpen: boolean;
  setMobileNav: (open: boolean) => void;

  toasts: Toast[];
  toast: (message: string, tone?: 'ok' | 'bad') => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUI = create<UIState>((set) => ({
  mobileNavOpen: false,
  setMobileNav: (open) => set({ mobileNavOpen: open }),

  toasts: [],
  toast: (message, tone = 'ok') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Saved listings. Kept in the store because the bookmark has to feel instant,
 * then written through to Postgres for signed-in users. Signed-out visitors
 * get localStorage, and whatever they saved is merged on their first sign-in.
 */

const SAVED_KEY = 'websale.saved';

function readLocalSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSaved(ids: string[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable; the in-memory copy still works for this session.
  }
}

interface SavedState {
  ids: string[];
  isSaved: (listingId: string) => boolean;
  toggle: (listingId: string, userId: string | null) => Promise<void>;
  hydrate: (userId: string | null) => Promise<void>;
}

export const useSaved = create<SavedState>((set, get) => ({
  ids: readLocalSaved(),

  isSaved: (listingId) => get().ids.includes(listingId),

  toggle: async (listingId, userId) => {
    const has = get().ids.includes(listingId);
    const next = has ? get().ids.filter((id) => id !== listingId) : [...get().ids, listingId];
    set({ ids: next });
    writeLocalSaved(next);

    if (!supabase || !userId) return;

    if (has) {
      await supabase.from('saved_listings').delete().match({ user_id: userId, listing_id: listingId });
    } else {
      await supabase.from('saved_listings').upsert({ user_id: userId, listing_id: listingId });
    }
  },

  hydrate: async (userId) => {
    if (!supabase || !userId) return;

    const { data } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', userId);

    const remote = (data ?? []).map((row) => row.listing_id as string);
    const local = readLocalSaved();
    // Demo listing ids have no row in Postgres, so keep them local-only rather
    // than pushing rows that would violate the foreign key.
    const demoIds = new Set(demoListings.map((l) => l.id));
    const toPush = local.filter((id) => !remote.includes(id) && !demoIds.has(id));

    if (toPush.length) {
      await supabase
        .from('saved_listings')
        .upsert(toPush.map((listing_id) => ({ user_id: userId, listing_id })));
    }

    const merged = Array.from(new Set([...remote, ...local]));
    set({ ids: merged });
    writeLocalSaved(merged);
  },
}));
