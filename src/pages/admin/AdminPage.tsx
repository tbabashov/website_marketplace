import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { Arrow, Button } from '@/components/ui/Button';
import { Field, RadioRow, TextArea, TextInput } from '@/components/ui/Form';
import { EmptyState, LoadingBlock, Spinner, StatusPill } from '@/components/ui/Bits';
import {
  fetchAllOrders,
  fetchCaseStudies,
  fetchListings,
  fetchPaymentQueue,
  fetchRequestQueue,
  signedReceiptUrl,
  type PaymentReviewRow,
} from '@/lib/api';
import { formatAzn, formatDate, formatDateTime, pickText } from '@/lib/format';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useUI } from '@/store/ui';
import type { Locale } from '@/config/site';
import type { CaseStudy, Listing, Order, SiteRequest } from '@/types/db';

type Tab = 'payments' | 'requests' | 'orders' | 'listings' | 'cases';
const TABS: Tab[] = ['payments', 'requests', 'orders', 'listings', 'cases'];

const REJECT_REASONS = ['notFound', 'amount', 'reference', 'other'] as const;

/* ------------------------------------------------------------------------ */
/* Payments                                                                  */
/* ------------------------------------------------------------------------ */

function PaymentCard({ row, onDone }: { row: PaymentReviewRow; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const toast = useUI((s) => s.toast);

  const [receipt, setReceipt] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<(typeof REJECT_REASONS)[number]>('notFound');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void signedReceiptUrl(row.receipt_path).then((url) => {
      if (alive) setReceipt(url);
    });
    return () => {
      alive = false;
    };
  }, [row.receipt_path]);

  const expected = row.order?.total_azn ?? null;
  const mismatch = expected !== null && Math.abs(expected - row.claimed_amount_azn) > 0.009;

  async function run(fn: string, args: Record<string, unknown>, message: string) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    toast(message);
    onDone();
  }

  return (
    <article className="rounded-3xl bg-paper-2 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Link to={`/orders/${row.order_id}`} className="label text-blue hover:text-blue">
          {row.order?.ref ?? row.order_id.slice(0, 8)}
        </Link>
        <span className="label text-ink-mute">{formatDateTime(row.created_at, locale)}</span>
      </div>

      {row.order && (
        <p className="mt-3 font-display text-d4 text-ink">
          {pickText(row.order.title, locale) || t('order.customBuild')}
        </p>
      )}

      <dl className="mt-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="label text-ink-mute">{t('admin.claimedAmount')}</dt>
          <dd className={clsx('num text-sm tabular-nums', mismatch ? 'text-red' : 'text-ink')}>
            {formatAzn(row.claimed_amount_azn, locale)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="label text-ink-mute">{t('admin.expectedAmount')}</dt>
          <dd className="num text-sm text-ink-soft tabular-nums">{formatAzn(expected, locale)}</dd>
        </div>
        {row.paid_at && (
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="label text-ink-mute">{t('checkout.paidAt')}</dt>
            <dd className="text-sm text-ink">{formatDate(row.paid_at, locale)}</dd>
          </div>
        )}
      </dl>

      {mismatch && <p className="label mt-3 text-red">{t('admin.amountMismatch')}</p>}

      {row.buyer_note && (
        <div className="mt-5">
          <p className="label mb-2 text-ink-mute">{t('admin.buyerNote')}</p>
          <p className="text-sm text-ink-soft">{row.buyer_note}</p>
        </div>
      )}

      {receipt && (
        <a
          href={receipt}
          target="_blank"
          rel="noreferrer noopener"
          className="label mt-5 inline-flex text-blue hover:text-blue"
        >
          {t('order.viewReceipt')}
        </a>
      )}

      {/* The one thing that must not be skimmed: the receipt is not evidence. */}
      <p className="mt-6 rounded-2xl bg-amber/10 px-4 py-3.5 text-xs leading-relaxed text-ink-soft">
        {t('admin.receiptWarning')}
      </p>

      {!rejecting ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            disabled={busy}
            onClick={() =>
              void run('confirm_payment', { p_payment_id: row.id }, t('admin.confirmed'))
            }
          >
            {busy && <Spinner />}
            {t('admin.confirm')}
          </Button>
          <Button variant="danger" onClick={() => setRejecting(true)}>
            {t('admin.reject')}
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5 border-t border-line pt-6">
          <fieldset>
            <legend className="label mb-3 text-ink-soft">{t('admin.rejectReasonLabel')}</legend>
            <RadioRow
              name={`reason-${row.id}`}
              value={reason}
              onChange={setReason}
              options={REJECT_REASONS.map((r) => ({
                value: r,
                label: t(`admin.rejectReasons.${r}`),
              }))}
            />
          </fieldset>

          <Field label={t('admin.rejectDetail')} optional optionalLabel={t('common.optional')}>
            {({ id }) => (
              <TextArea id={id} rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
            )}
          </Field>

          <div className="flex gap-3">
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void run(
                  'reject_payment',
                  { p_payment_id: row.id, p_reason: reason, p_detail: detail.trim() || null },
                  t('admin.rejected'),
                )
              }
            >
              {busy && <Spinner />}
              {t('admin.reject')}
            </Button>
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------------ */
/* Requests → quotes                                                         */
/* ------------------------------------------------------------------------ */

function RequestCard({ request, onDone }: { request: SiteRequest; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const toast = useUI((s) => s.toast);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState('');
  const [deposit, setDeposit] = useState('');
  const [delivery, setDelivery] = useState('');
  const [scope, setScope] = useState('');
  const [note, setNote] = useState('');
  const [validDays, setValidDays] = useState('14');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase
      .from('orders')
      .select('id')
      .eq('request_id', request.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setOrderId((data?.id as string) ?? null);
      });
    return () => {
      alive = false;
    };
  }, [request.id]);

  async function send() {
    if (!supabase || !orderId) return;
    setBusy(true);
    const { error } = await supabase.rpc('send_quote', {
      p_order_id: orderId,
      p_total: Number(total),
      p_deposit: deposit ? Number(deposit) : null,
      // Scope is stored per-locale; the Owner writes it once in the language
      // the buyer used, and the same text is served for all three.
      p_scope: scope.trim() ? { az: scope, en: scope, ru: scope } : null,
      p_note: note.trim() || null,
      p_delivery: delivery || null,
      p_valid_days: Number(validDays) || 14,
    });
    setBusy(false);
    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    toast(t('admin.quoteSent'));
    setOpen(false);
    onDone();
  }

  return (
    <article className="rounded-3xl bg-paper-2 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="label text-blue">{request.status}</span>
        <span className="label text-ink-mute">{formatDate(request.created_at, locale)}</span>
      </div>

      <h3 className="mt-3 font-display text-d3 text-ink">{request.business_name}</h3>
      <p className="mt-1 text-sm text-ink-soft">{request.business_type}</p>

      {request.business_desc && <p className="mt-4 text-sm text-ink-soft">{request.business_desc}</p>}

      <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <dt className="label text-ink-mute">{t('request.pagesLabel')}</dt>
          <dd className="mt-1 text-sm text-ink">
            {request.pages.map((p) => t(`request.pageOptions.${p}`, p)).join(', ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="label text-ink-mute">{t('request.featuresLabel')}</dt>
          <dd className="mt-1 text-sm text-ink">
            {request.features.map((f) => t(`request.featureOptions.${f}`, f)).join(', ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="label text-ink-mute">{t('request.budgetLabel')}</dt>
          <dd className="mt-1 text-sm text-ink">
            {request.budget_range ? t(`request.budgetOptions.${request.budget_range}`, request.budget_range) : '—'}
          </dd>
        </div>
        <div>
          <dt className="label text-ink-mute">{t('request.timelineLabel')}</dt>
          <dd className="mt-1 text-sm text-ink">
            {request.timeline ? t(`request.timelineOptions.${request.timeline}`, request.timeline) : '—'}
          </dd>
        </div>
        {request.style_refs && (
          <div className="sm:col-span-2">
            <dt className="label text-ink-mute">{t('request.styleRefs')}</dt>
            <dd className="mt-1 break-words text-sm text-ink">{request.style_refs}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="label text-ink-mute">{t('request.contactPreferred')}</dt>
          <dd className="mt-1 text-sm text-ink">
            {request.contact_name} · {request.contact_email}
            {request.contact_phone ? ` · ${request.contact_phone}` : ''}
          </dd>
        </div>
      </dl>

      {orderId && !open && (
        <Button className="mt-6" onClick={() => setOpen(true)}>
          {t('admin.sendQuote')}
          <Arrow />
        </Button>
      )}

      {open && (
        <div className="mt-6 flex flex-col gap-5 border-t border-line pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('admin.quoteAmount')}>
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min="0"
                  step="1"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('order.deposit')} optional optionalLabel={t('common.optional')}>
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min="0"
                  step="1"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('admin.quoteDelivery')}>
              {({ id }) => (
                <TextInput
                  id={id}
                  type="date"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('admin.quoteValidDays')}>
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min="1"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label={t('admin.quoteScope')}>
            {({ id }) => <TextArea id={id} value={scope} onChange={(e) => setScope(e.target.value)} />}
          </Field>

          <Field label={t('admin.quoteNote')} optional optionalLabel={t('common.optional')}>
            {({ id }) => (
              <TextArea id={id} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            )}
          </Field>

          <div className="flex gap-3">
            <Button disabled={busy || !total} onClick={() => void send()}>
              {busy && <Spinner />}
              {t('admin.sendQuoteAction')}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------------ */
/* Orders — production transitions                                           */
/* ------------------------------------------------------------------------ */

function OrderAdminRow({ order, onDone }: { order: Order; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const toast = useUI((s) => s.toast);

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(order.delivery_url ?? '');
  const [notes, setNotes] = useState(order.delivery_notes ?? '');
  const [busy, setBusy] = useState(false);

  async function run(fn: string, args: Record<string, unknown>) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    setOpen(false);
    onDone();
  }

  return (
    <li className="border-b border-line py-5 first:border-t">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/orders/${order.id}`} className="label text-blue hover:text-blue">
          {order.ref}
        </Link>
        <StatusPill status={order.status} />
        <span className="ml-auto num text-sm text-ink tabular-nums">
          {formatAzn(order.total_azn, locale)}
        </span>
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        {pickText(order.title, locale) || t('order.customBuild')}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {(order.status === 'paid' || order.status === 'awaiting_payment') && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run('start_work', { p_order_id: order.id })}
          >
            {t('admin.setInProgress')}
          </Button>
        )}
        {/* 'delivered' is included so a ready-made order — which jumps straight
            there the moment payment is confirmed — can still have its handover
            link and logins filled in afterwards. */}
        {(order.status === 'in_progress' ||
          order.status === 'paid' ||
          order.status === 'delivered') && (
          <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
            {t('admin.markDelivered')}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-5 flex max-w-xl flex-col gap-4 border-t border-line pt-5">
          <Field label={t('admin.deliveryLink')}>
            {({ id }) => (
              <TextInput id={id} type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
            )}
          </Field>
          <Field label={t('admin.deliveryNotes')}>
            {({ id }) => <TextArea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
          <Button
            className="self-start"
            disabled={busy}
            onClick={() =>
              void run('deliver_order', {
                p_order_id: order.id,
                p_url: url.trim() || null,
                p_notes: notes.trim() || null,
              })
            }
          >
            {busy && <Spinner />}
            {t('admin.markDelivered')}
          </Button>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------------ */
/* Catalogue management                                                      */
/* ------------------------------------------------------------------------ */

function CatalogueRow({
  table,
  id,
  title,
  meta,
  isPublished,
  onDone,
}: {
  table: 'listings' | 'case_studies';
  id: string;
  title: string;
  meta: string;
  isPublished: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const toast = useUI((s) => s.toast);
  const [busy, setBusy] = useState(false);

  async function update(patch: Record<string, unknown>) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from(table).update(patch).eq('id', id);
    setBusy(false);
    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    onDone();
  }

  async function remove() {
    if (!supabase || !window.confirm(t('admin.confirmDelete'))) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq('id', id);
    setBusy(false);
    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    onDone();
  }

  const togglePatch =
    table === 'listings'
      ? { status: isPublished ? 'draft' : 'published' }
      : { published: !isPublished };

  return (
    <li className="flex flex-wrap items-center gap-4 py-4 first:border-t">
      <div className="min-w-0 flex-1">
        <p className="text-ink">{title}</p>
        <p className="label mt-1 text-ink-mute">{meta}</p>
      </div>
      <span className={clsx('label', isPublished ? 'text-green' : 'text-ink-mute')}>
        {isPublished ? t('admin.statusPublished') : t('admin.statusDraft')}
      </span>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void update(togglePatch)}>
        {isPublished ? t('admin.unpublish') : t('admin.publish')}
      </Button>
      <Button size="sm" variant="danger" disabled={busy} onClick={() => void remove()}>
        {t('admin.delete')}
      </Button>
    </li>
  );
}

/* ------------------------------------------------------------------------ */

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  useSeo({ title: `${t('admin.pageTitle')} — WebSale.az`, description: t('admin.lead'), noindex: true });

  const [tab, setTab] = useState<Tab>('payments');
  const [payments, setPayments] = useState<PaymentReviewRow[] | null>(null);
  const [requests, setRequests] = useState<SiteRequest[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [cases, setCases] = useState<CaseStudy[]>([]);

  const reload = useCallback(async () => {
    const [p, r, o, l, c] = await Promise.all([
      fetchPaymentQueue(),
      fetchRequestQueue(),
      fetchAllOrders(),
      fetchListings(),
      fetchCaseStudies(),
    ]);
    setPayments(p);
    setRequests(r);
    setOrders(o);
    setListings(l.data);
    setCases(c.data);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <>
      <PageHead label={t('nav.admin')} title={t('admin.pageTitle')} lead={t('admin.lead')} />

      <div className="px-5 py-10 pb-24 md:px-10">
        <div className="mx-auto max-w-[1440px]">
          {/* Plain toggle buttons rather than role="tablist": a real tablist
              owes the user arrow-key navigation and matching tabpanels, and a
              half-implemented one is worse for screen readers than none. */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-line pb-4">
            {TABS.map((name) => {
              const count =
                name === 'payments'
                  ? payments?.length
                  : name === 'requests'
                    ? requests?.length
                    : name === 'orders'
                      ? orders?.length
                      : name === 'listings'
                        ? listings.length
                        : cases.length;

              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={tab === name}
                  onClick={() => setTab(name)}
                  className={clsx(
                    'label flex items-center gap-2 py-1 transition-colors',
                    tab === name ? 'text-blue' : 'text-ink-mute hover:text-ink',
                  )}
                >
                  {t(`admin.tabs.${name}`)}
                  {count !== undefined && <span className="tabular-nums">/ {count}</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-10">
            {tab === 'payments' &&
              (payments === null ? (
                <LoadingBlock />
              ) : payments.length === 0 ? (
                <EmptyState title={t('admin.queueEmpty')} />
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  {payments.map((row) => (
                    <PaymentCard key={row.id} row={row} onDone={() => void reload()} />
                  ))}
                </div>
              ))}

            {tab === 'requests' &&
              (requests === null ? (
                <LoadingBlock />
              ) : requests.length === 0 ? (
                <EmptyState title={t('admin.queueEmpty')} />
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  {requests.map((request) => (
                    <RequestCard key={request.id} request={request} onDone={() => void reload()} />
                  ))}
                </div>
              ))}

            {tab === 'orders' &&
              (orders === null ? (
                <LoadingBlock />
              ) : orders.length === 0 ? (
                <EmptyState title={t('admin.queueEmpty')} />
              ) : (
                <ul>
                  {orders.map((order) => (
                    <OrderAdminRow key={order.id} order={order} onDone={() => void reload()} />
                  ))}
                </ul>
              ))}

            {tab === 'listings' &&
              (listings.length === 0 ? (
                <EmptyState title={t('market.empty')} />
              ) : (
                <ul>
                  {listings.map((listing) => (
                    <CatalogueRow
                      key={listing.id}
                      table="listings"
                      id={listing.id}
                      title={pickText(listing.title, locale) || listing.slug}
                      meta={`${listing.slug} · ${formatAzn(listing.price_azn, locale)}`}
                      isPublished={listing.status === 'published'}
                      onDone={() => void reload()}
                    />
                  ))}
                </ul>
              ))}

            {tab === 'cases' &&
              (cases.length === 0 ? (
                <EmptyState title={t('portfolio.empty')} />
              ) : (
                <ul>
                  {cases.map((study) => (
                    <CatalogueRow
                      key={study.id}
                      table="case_studies"
                      id={study.id}
                      title={pickText(study.title, locale) || study.slug}
                      meta={`${study.slug}${study.year ? ` · ${study.year}` : ''}`}
                      isPublished={study.published}
                      onDone={() => void reload()}
                    />
                  ))}
                </ul>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
