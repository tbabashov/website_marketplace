import { supabase } from '@/lib/supabase';
import { demoCaseStudies, demoListings } from '@/lib/demoData';
import type {
  CaseStudy,
  Listing,
  Order,
  OrderDetail,
  OrderEvent,
  Payment,
  Review,
  SiteRequest,
} from '@/types/db';

/**
 * Every read here degrades to demo content when Supabase is absent, and to
 * demo content again when a query fails — a network blip on the portfolio page
 * should not blank the marketing site. Writes never fall back; they surface
 * the error, because silently discarding an order would be far worse than an
 * error message.
 */

export interface Fetched<T> {
  data: T;
  /** True when the caller is looking at demo content, not the database. */
  isDemo: boolean;
}

// ---------------------------------------------------------------------------
// Public catalogue
// ---------------------------------------------------------------------------

export async function fetchCaseStudies(): Promise<Fetched<CaseStudy[]>> {
  if (!supabase) return { data: demoCaseStudies, isDemo: true };

  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data?.length) return { data: demoCaseStudies, isDemo: true };
  return { data: data as CaseStudy[], isDemo: false };
}

export async function fetchCaseStudy(slug: string): Promise<Fetched<CaseStudy | null>> {
  if (!supabase) {
    return { data: demoCaseStudies.find((c) => c.slug === slug) ?? null, isDemo: true };
  }

  const { data, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    const fallback = demoCaseStudies.find((c) => c.slug === slug) ?? null;
    return { data: fallback, isDemo: fallback !== null };
  }
  return { data: data as CaseStudy, isDemo: false };
}

export async function fetchListings(): Promise<Fetched<Listing[]>> {
  if (!supabase) return { data: demoListings, isDemo: true };

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .in('status', ['published', 'sold'])
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data?.length) return { data: demoListings, isDemo: true };
  return { data: data as Listing[], isDemo: false };
}

export async function fetchListing(slug: string): Promise<Fetched<Listing | null>> {
  if (!supabase) {
    return { data: demoListings.find((l) => l.slug === slug) ?? null, isDemo: true };
  }

  const { data, error } = await supabase.from('listings').select('*').eq('slug', slug).maybeSingle();

  if (error || !data) {
    const fallback = demoListings.find((l) => l.slug === slug) ?? null;
    return { data: fallback, isDemo: fallback !== null };
  }
  return { data: data as Listing, isDemo: false };
}

/**
 * Published reviews. There is no demo fallback on purpose: an empty reviews
 * section is honest, an invented one is not.
 */
export async function fetchReviews(limit = 12): Promise<Review[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as Review[]) ?? [];
}

// ---------------------------------------------------------------------------
// Orders — buyer side
// ---------------------------------------------------------------------------

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data as Order[]) ?? [];
}

export async function fetchOrder(orderId: string): Promise<OrderDetail | null> {
  if (!supabase) return null;

  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return null;

  const [{ data: payments }, { data: events }] = await Promise.all([
    supabase.from('payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
    supabase.from('order_events').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
  ]);

  const detail: OrderDetail = {
    ...(order as Order),
    payments: (payments as Payment[]) ?? [],
    events: (events as OrderEvent[]) ?? [],
  };

  if (order.request_id) {
    const { data: request } = await supabase
      .from('site_requests')
      .select('*')
      .eq('id', order.request_id)
      .maybeSingle();
    detail.request = (request as SiteRequest) ?? null;
  }

  if (order.listing_id) {
    const { data: listing } = await supabase
      .from('listings')
      .select('id, slug, cover_image, demo_url')
      .eq('id', order.listing_id)
      .maybeSingle();
    detail.listing = (listing as OrderDetail['listing']) ?? null;
  }

  return detail;
}

export async function fetchMyRequests(userId: string): Promise<SiteRequest[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('site_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data as SiteRequest[]) ?? [];
}

// ---------------------------------------------------------------------------
// Owner desk
// ---------------------------------------------------------------------------

export interface PaymentReviewRow extends Payment {
  order: Order | null;
}

export async function fetchPaymentQueue(): Promise<PaymentReviewRow[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('payments')
    .select('*, order:orders(*)')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true });

  return (data as PaymentReviewRow[]) ?? [];
}

export async function fetchRequestQueue(): Promise<SiteRequest[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('site_requests')
    .select('*')
    .in('status', ['new', 'quoted'])
    .order('created_at', { ascending: true });

  return (data as SiteRequest[]) ?? [];
}

export async function fetchAllOrders(): Promise<Order[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('orders')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  return (data as Order[]) ?? [];
}

/**
 * Receipts live in a private bucket. The Owner gets a short-lived signed URL
 * rather than a permanent link, so a copied URL stops working quickly.
 */
export async function signedReceiptUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
