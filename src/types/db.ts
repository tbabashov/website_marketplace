import type { Locale } from '@/config/site';

/** Localised text as stored in Postgres jsonb. Any key may be missing. */
export type L10nText = Partial<Record<Locale, string>>;

export type ListingStatus = 'draft' | 'published' | 'sold';

export type OrderKind = 'listing' | 'custom';

export type OrderStatus =
  | 'draft'
  | 'quote_requested'
  | 'quoted'
  | 'quote_declined'
  | 'awaiting_payment'
  | 'payment_submitted'
  | 'paid'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'payment_rejected'
  | 'cancelled';

export type PaymentKind = 'full' | 'deposit' | 'balance';
export type PaymentStatus = 'submitted' | 'confirmed' | 'rejected';
export type RequestStatus = 'new' | 'quoted' | 'accepted' | 'declined' | 'archived';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_owner: boolean;
  created_at: string;
}

export interface CaseStudy {
  id: string;
  slug: string;
  title: L10nText;
  client: string | null;
  summary: L10nText;
  problem: L10nText;
  built: L10nText;
  outcome: L10nText;
  industry: string | null;
  stack: string[];
  tags: string[];
  year: number | null;
  live_url: string | null;
  cover_image: string | null;
  gallery: string[];
  published: boolean;
  sort_order: number;
  created_at: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: L10nText;
  tagline: L10nText;
  description: L10nText;
  best_for: L10nText;
  price_azn: number;
  category: string | null;
  page_count: number | null;
  pages: string[];
  stack: string[];
  demo_url: string | null;
  cover_image: string | null;
  screenshots: string[];
  license: string;
  status: ListingStatus;
  sort_order: number;
  created_at: string;
}

export interface SiteRequest {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_desc: string | null;
  has_website: boolean;
  current_url: string | null;
  pages: string[];
  features: string[];
  style_refs: string | null;
  style_notes: string | null;
  has_branding: boolean;
  budget_range: string | null;
  timeline: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  contact_preferred: string;
  status: RequestStatus;
  created_at: string;
}

export interface Order {
  id: string;
  ref: string;
  user_id: string;
  kind: OrderKind;
  listing_id: string | null;
  request_id: string | null;
  title: L10nText;
  total_azn: number | null;
  deposit_azn: number | null;
  paid_azn: number;
  status: OrderStatus;
  quote_scope: L10nText | null;
  quote_note: string | null;
  quote_delivery: string | null;
  quote_expires_at: string | null;
  quoted_at: string | null;
  decline_reason: string | null;
  delivery_url: string | null;
  delivery_notes: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  kind: PaymentKind;
  claimed_amount_azn: number;
  paid_at: string | null;
  receipt_path: string;
  buyer_note: string | null;
  status: PaymentStatus;
  reject_reason: string | null;
  reject_detail: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string | null;
  published: boolean;
  created_at: string;
}

/** An order joined with everything the order page needs in one shape. */
export interface OrderDetail extends Order {
  payments: Payment[];
  events: OrderEvent[];
  request?: SiteRequest | null;
  listing?: Pick<Listing, 'id' | 'slug' | 'cover_image' | 'demo_url'> | null;
}

/**
 * The states in which the *buyer* is the one holding things up. Used to badge
 * the dashboard so nobody has to read a status list to work out whose turn it
 * is.
 */
export const BUYER_ACTION_STATES: readonly OrderStatus[] = [
  'quoted',
  'awaiting_payment',
  'payment_rejected',
  'delivered',
] as const;

export const OPEN_ORDER_STATES: readonly OrderStatus[] = [
  'quote_requested',
  'quoted',
  'awaiting_payment',
  'payment_submitted',
  'paid',
  'in_progress',
  'delivered',
  'payment_rejected',
] as const;

/** Milestones shown on the buyer's tracker, in order. */
export const ORDER_MILESTONES: readonly OrderStatus[] = [
  'awaiting_payment',
  'payment_submitted',
  'in_progress',
  'delivered',
  'completed',
] as const;

/**
 * States from which a buyer may call an order back. Mirrors the guard in
 * cancel_order(): everything up to, but not including, submitting a receipt.
 */
export const CANCELLABLE_STATES: readonly OrderStatus[] = [
  'draft',
  'quote_requested',
  'quoted',
  'awaiting_payment',
  'payment_rejected',
] as const;

export function canCallBack(status: OrderStatus): boolean {
  return CANCELLABLE_STATES.includes(status);
}
