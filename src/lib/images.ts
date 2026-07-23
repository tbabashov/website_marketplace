import manifest from '../../image-manifest.json';
import type { Locale } from '@/config/site';

export interface ImageSlot {
  id: string;
  expected_path: string;
  search_terms: string;
  aspect_ratio: string;
  min_width_px: number;
  alt_text: Record<Locale, string>;
  placement_note: string;
}

const slots = new Map<string, ImageSlot>(
  (manifest.slots as ImageSlot[]).map((slot) => [slot.id, slot]),
);

export function getSlot(id: string): ImageSlot | undefined {
  return slots.get(id);
}

/** "16:9" -> 1.777…, for the CSS aspect-ratio that reserves the space. */
export function aspectValue(ratio: string): string {
  const [w, h] = ratio.split(':');
  return w && h ? `${w} / ${h}` : '16 / 9';
}

/**
 * A stable wash per slot, so placeholders are distinguishable from one another
 * but every one of them stays inside the paper palette. Cheap string hash —
 * this only needs to be deterministic, not well distributed.
 */
export function placeholderTone(seed: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const tones: Array<{ from: string; to: string }> = [
    { from: '#e7e4db', to: '#d8dae8' },
    { from: '#e9e5dc', to: '#dcd6ca' },
    { from: '#e4e3e0', to: '#d3d8ea' },
    { from: '#eae6de', to: '#d9dbd4' },
  ];
  return tones[Math.abs(hash) % tones.length]!;
}
