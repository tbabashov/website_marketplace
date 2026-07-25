import type { Listing } from '@/types/db';

/** Round to whole qəpik, matching Postgres round(x, 2) in create_listing_order. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** True when the owner has set a discount on this listing. */
export function hasDiscount(listing: Pick<Listing, 'discount_percent'>): boolean {
  return (listing.discount_percent ?? 0) > 0;
}

/** Apply a percentage off an amount, rounded like the server does. */
export function applyPercent(amount: number, percentOff: number): number {
  if (!percentOff) return amount;
  return round2(amount * (1 - percentOff / 100));
}

/**
 * The price a buyer pays for a listing after its own discount but before any
 * promo code. Mirrors create_listing_order, the source of truth for the order
 * total, so the figure shown on the page matches what is charged.
 */
export function effectivePrice(listing: Pick<Listing, 'price_azn' | 'discount_percent'>): number {
  return applyPercent(listing.price_azn, listing.discount_percent ?? 0);
}
