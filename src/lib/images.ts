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
 * A stable colour pair per slot so each placeholder is distinguishable but all
 * of them stay inside the palette. Cheap string hash — this only needs to be
 * deterministic, not well distributed.
 */
export function placeholderTone(seed: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const tones: Array<{ from: string; to: string }> = [
    { from: '#1b2530', to: '#243642' },
    { from: '#1d2029', to: '#2b3340' },
    { from: '#182028', to: '#22323a' },
    { from: '#20232c', to: '#2c3a44' },
  ];
  return tones[Math.abs(hash) % tones.length]!;
}
