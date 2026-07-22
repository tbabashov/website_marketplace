import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { Arrow, Button, ButtonLink } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Form';
import { EmptyState, LoadingBlock, Spinner, StatusPill, Stars } from '@/components/ui/Bits';
import { fetchOrder, signedReceiptUrl } from '@/lib/api';
import { formatAzn, formatDate, formatDateTime, pickText } from '@/lib/format';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import type { Locale } from '@/config/site';
import { ORDER_MILESTONES, type OrderDetail, type OrderStatus } from '@/types/db';

/** Where the order sits on the five-step tracker. -1 for states off the path. */
function milestoneIndex(status: OrderStatus): number {
  const direct = ORDER_MILESTONES.indexOf(status);
  if (direct >= 0) return direct;
  if (status === 'paid') return 2;
  if (status === 'payment_rejected') return 1;
  if (status === 'quoted' || status === 'quote_requested') return 0;
  return -1;
}

function Tracker({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const active = milestoneIndex(status);
  const failed = status === 'payment_rejected' || status === 'cancelled';

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
      {ORDER_MILESTONES.map((milestone, i) => {
        const done = active > i;
        const current = active === i;
        return (
          <li key={milestone} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-3">
            <div className="flex w-full items-center gap-2">
              <span
                aria-hidden="true"
                className={clsx(
                  'h-2 w-2 shrink-0 rounded-full',
                  failed && current
                    ? 'bg-rust'
                    : current
                      ? 'bg-cyan'
                      : done
                        ? 'bg-sage'
                        : 'bg-rule',
                )}
              />
              {i < ORDER_MILESTONES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={clsx('hidden h-px flex-1 sm:block', done ? 'bg-sage/40' : 'bg-rule-soft')}
                />
              )}
            </div>
            <span
              className={clsx(
                'spec',
                current ? 'text-bone' : done ? 'text-bone-mute' : 'text-bone-faint/60',
              )}
            >
              {t(`status.${milestone}`)}
              {current && <span className="sr-only"> ({t('a11y.currentStep')})</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReceiptLink({ path }: { path: string }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void signedReceiptUrl(path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [path]);

  if (!url) return <span className="spec text-bone-faint">{t('common.loading')}</span>;

  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="spec text-cyan hover:text-cyan-bright">
      {t('order.viewReceipt')}
      <span className="sr-only"> ({t('a11y.openInNewTab')})</span>
    </a>
  );
}

export default function OrderPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  const user = useAuth((s) => s.user);
  const toast = useUI((s) => s.toast);

  const [order, setOrder] = useState<OrderDetail | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewed, setReviewed] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchOrder(id);
    setOrder(data);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useSeo({
    title: order ? `${t('order.reference')} ${order.ref} — WebSale.az` : t('order.pageTitle'),
    description: t('dashboard.lead'),
    noindex: true,
  });

  async function call(fn: string, args: Record<string, unknown>) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    await load();
  }

  async function submitReview() {
    if (!supabase || rating < 1) return;
    setBusy(true);
    const { error } = await supabase.rpc('submit_review', {
      p_order_id: id,
      p_rating: rating,
      p_body: reviewBody.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast(readableError(error), 'bad');
      return;
    }
    setReviewed(true);
    toast(t('reviews.submitted'));
  }

  if (order === undefined) return <LoadingBlock />;

  if (order === null || (user && order.user_id !== user.id)) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-32">
        <EmptyState
          title={t('order.notFound')}
          action={
            <ButtonLink to="/dashboard" variant="secondary">
              {t('nav.dashboard')}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const helpKey = `status.help.${order.status}`;
  const help = t(helpKey);
  const owesPayment = order.status === 'awaiting_payment' || order.status === 'payment_rejected';

  return (
    <>
      <PageHead
        label={`${t('order.reference')} ${order.ref}`}
        title={pickText(order.title, locale) || t('order.customBuild')}
        aside={<StatusPill status={order.status} />}
      />

      <div className="px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
          <div className="min-w-0">
            <section aria-labelledby="progress">
              <h2 id="progress" className="spec text-cyan">
                {t('order.timeline')}
              </h2>
              <div className="mt-6">
                <Tracker status={order.status} />
              </div>
              {help !== helpKey && <p className="mt-6 max-w-xl text-bone-mute">{help}</p>}
            </section>

            {/* Quote — the buyer's decision point on a custom build */}
            {order.status === 'quoted' && (
              <section aria-labelledby="quote" className="mt-12 border border-brass/40 bg-surface p-6 sm:p-8">
                <h2 id="quote" className="spec text-brass">
                  {t('order.quoteTitle')}
                </h2>

                <p className="mt-5 font-display text-h1 text-bone tabular-nums">
                  {formatAzn(order.total_azn, locale)}
                </p>

                <dl className="mt-6 border-t border-rule-soft pt-4">
                  {order.quote_delivery && (
                    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5">
                      <dt className="spec text-bone-faint">{t('order.quoteDelivery')}</dt>
                      <dd className="text-sm text-bone">{formatDate(order.quote_delivery, locale)}</dd>
                    </div>
                  )}
                  {order.deposit_azn !== null && (
                    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5">
                      <dt className="spec text-bone-faint">{t('order.deposit')}</dt>
                      <dd className="font-mono text-sm text-bone tabular-nums">
                        {formatAzn(order.deposit_azn, locale)}
                      </dd>
                    </div>
                  )}
                </dl>

                {order.quote_scope && pickText(order.quote_scope, locale) && (
                  <div className="mt-6">
                    <p className="spec mb-2 text-bone-faint">{t('order.quoteScope')}</p>
                    <p className="whitespace-pre-line text-bone-mute">
                      {pickText(order.quote_scope, locale)}
                    </p>
                  </div>
                )}

                {order.quote_note && (
                  <div className="mt-6">
                    <p className="spec mb-2 text-bone-faint">{t('order.quoteNote')}</p>
                    <p className="whitespace-pre-line text-bone-mute">{order.quote_note}</p>
                  </div>
                )}

                {order.quote_expires_at && (
                  <p className="spec mt-6 text-bone-faint">
                    {t('order.quoteExpires', { date: formatDate(order.quote_expires_at, locale) })}
                  </p>
                )}

                <div className="mt-8 flex flex-col gap-4">
                  <Button
                    size="lg"
                    className="self-start"
                    disabled={busy}
                    onClick={() => void call('accept_quote', { p_order_id: order.id })}
                  >
                    {busy && <Spinner />}
                    {t('order.acceptQuote')}
                    {!busy && <Arrow />}
                  </Button>

                  <details className="group">
                    <summary className="spec cursor-pointer list-none text-bone-faint hover:text-bone">
                      {t('order.declineQuote')}
                    </summary>
                    <div className="mt-4 flex flex-col gap-4">
                      <Field label={t('order.declineReason')} optional optionalLabel={t('common.optional')}>
                        {({ id }) => (
                          <TextArea
                            id={id}
                            rows={3}
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                          />
                        )}
                      </Field>
                      <Button
                        variant="danger"
                        className="self-start"
                        disabled={busy}
                        onClick={() =>
                          void call('decline_quote', {
                            p_order_id: order.id,
                            p_reason: declineReason.trim() || null,
                          })
                        }
                      >
                        {t('order.declineQuote')}
                      </Button>
                    </div>
                  </details>
                </div>
              </section>
            )}

            {/* Payment history and rejection feedback */}
            {order.payments.length > 0 && (
              <section aria-labelledby="receipts" className="mt-12 border-t border-rule-soft pt-10">
                <h2 id="receipts" className="spec text-cyan">
                  {t('order.receipt')}
                </h2>

                <ul className="mt-6 flex flex-col gap-4">
                  {order.payments.map((p) => (
                    <li key={p.id} className="border border-rule-soft bg-surface px-5 py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <span className="font-mono text-sm text-bone tabular-nums">
                          {formatAzn(p.claimed_amount_azn, locale)}
                        </span>
                        <span className="spec text-bone-faint">
                          {t('order.receiptSubmitted', { date: formatDateTime(p.created_at, locale) })}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <span
                          className={clsx(
                            'spec',
                            p.status === 'confirmed'
                              ? 'text-sage'
                              : p.status === 'rejected'
                                ? 'text-rust'
                                : 'text-brass',
                          )}
                        >
                          {p.status === 'confirmed'
                            ? t('status.paid')
                            : p.status === 'rejected'
                              ? t('status.payment_rejected')
                              : t('status.payment_submitted')}
                        </span>
                        <ReceiptLink path={p.receipt_path} />
                      </div>

                      {p.status === 'rejected' && (
                        <div className="mt-4 border-l-2 border-rust/60 py-2 pl-4">
                          <p className="spec text-rust">{t('order.rejectedReason')}</p>
                          <p className="mt-2 text-sm text-bone-mute">
                            {p.reject_reason && t(`admin.rejectReasons.${p.reject_reason}`, p.reject_reason)}
                            {p.reject_detail ? ` — ${p.reject_detail}` : ''}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Handover */}
            {(order.status === 'delivered' || order.status === 'completed') && (
              <section aria-labelledby="delivery" className="mt-12 border border-cyan/40 bg-surface p-6 sm:p-8">
                <h2 id="delivery" className="spec text-cyan">
                  {t('order.deliveryTitle')}
                </h2>
                <p className="mt-4 text-bone-mute">{t('order.deliveryBody')}</p>

                {order.delivery_url && (
                  <ButtonLink to={order.delivery_url} external variant="secondary" className="mt-6">
                    {t('order.deliveryLink')}
                    <Arrow />
                  </ButtonLink>
                )}

                {order.delivery_notes && (
                  <div className="mt-6">
                    <p className="spec mb-2 text-bone-faint">{t('order.deliveryFiles')}</p>
                    <p className="whitespace-pre-line text-sm text-bone-mute">{order.delivery_notes}</p>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <Button
                    size="lg"
                    className="mt-8"
                    disabled={busy}
                    onClick={() => void call('complete_order', { p_order_id: order.id })}
                  >
                    {busy && <Spinner />}
                    {t('order.markComplete')}
                  </Button>
                )}
              </section>
            )}

            {/* Review — only reachable once the order is closed */}
            {order.status === 'completed' && !reviewed && (
              <section aria-labelledby="review" className="mt-12 border-t border-rule-soft pt-10">
                <h2 id="review" className="spec text-cyan">
                  {t('reviews.leaveReview')}
                </h2>

                <fieldset className="mt-6">
                  <legend className="spec mb-3 text-bone-mute">{t('reviews.yourRating')}</legend>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        aria-pressed={rating === n}
                        aria-label={t('reviews.ratingStars', { count: n })}
                        className={clsx(
                          'h-10 w-10 rounded-[2px] border font-mono text-sm transition-colors',
                          rating >= n
                            ? 'border-brass/60 bg-brass/10 text-brass'
                            : 'border-rule-soft text-bone-faint hover:border-rule',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-6 max-w-xl">
                  <Field label={t('reviews.yourReview')} optional optionalLabel={t('common.optional')}>
                    {({ id }) => (
                      <TextArea
                        id={id}
                        placeholder={t('reviews.reviewPlaceholder')}
                        value={reviewBody}
                        onChange={(e) => setReviewBody(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <Button className="mt-6" disabled={busy || rating < 1} onClick={() => void submitReview()}>
                  {busy && <Spinner />}
                  {t('reviews.submit')}
                </Button>
              </section>
            )}

            {reviewed && (
              <p className="mt-12 flex items-center gap-3 border-t border-rule-soft pt-10 text-sage">
                <Stars rating={rating} />
                {t('reviews.submitted')}
              </p>
            )}
          </div>

          {/* Summary rail */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-rule bg-surface p-6">
              <dl>
                <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5">
                  <dt className="spec text-bone-faint">{t('order.placed')}</dt>
                  <dd className="text-sm text-bone">{formatDate(order.created_at, locale)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5">
                  <dt className="spec text-bone-faint">{t('order.updated')}</dt>
                  <dd className="text-sm text-bone">{formatDate(order.updated_at, locale)}</dd>
                </div>
                {order.total_azn !== null && (
                  <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5">
                    <dt className="spec text-bone-faint">{t('order.total')}</dt>
                    <dd className="font-mono text-sm text-bone tabular-nums">
                      {formatAzn(order.total_azn, locale)}
                    </dd>
                  </div>
                )}
                {order.paid_azn > 0 && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="spec text-bone-faint">{t('status.paid')}</dt>
                    <dd className="font-mono text-sm text-sage tabular-nums">
                      {formatAzn(order.paid_azn, locale)}
                    </dd>
                  </div>
                )}
              </dl>

              {owesPayment && (
                <ButtonLink to={`/checkout/${order.id}`} size="lg" className="mt-6 w-full">
                  {order.paid_azn > 0 ? t('order.payBalance') : t('order.payNow')}
                  <Arrow />
                </ButtonLink>
              )}

              {!owesPayment && order.status !== 'completed' && order.status !== 'delivered' && (
                <p className="mt-6 border-t border-rule-soft pt-4 text-xs text-bone-faint">
                  {t('order.awaitingOwner')}
                </p>
              )}
            </div>

            {/* Event history, straight from order_events */}
            {order.events.length > 0 && (
              <ol className="mt-6 border border-rule-soft bg-surface/50 p-5">
                {order.events.map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2 last:border-b-0">
                    <span className="spec text-bone-mute">{t(`status.${event.to_status}`)}</span>
                    <span className="spec text-bone-faint/70">
                      {formatDate(event.created_at, locale)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
