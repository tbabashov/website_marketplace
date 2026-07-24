import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { Arrow, Button, ButtonLink } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Form';
import {
  EmptyState,
  Eyebrow,
  LoadingBlock,
  Shell,
  Spinner,
  StatusPill,
  Stars,
} from '@/components/ui/Bits';
import { fetchOrder, signedReceiptUrl } from '@/lib/api';
import { formatAzn, formatDate, formatDateTime, pickText } from '@/lib/format';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import type { Locale } from '@/config/site';
import { canCallBack, ORDER_MILESTONES, type OrderDetail, type OrderStatus } from '@/types/db';

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
    <ol className="flex flex-col gap-4 sm:flex-row sm:gap-2">
      {ORDER_MILESTONES.map((milestone, i) => {
        const done = active > i;
        const current = active === i;
        return (
          <li key={milestone} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start">
            <div className="flex w-full items-center gap-2">
              <span
                aria-hidden="true"
                className={clsx(
                  'h-2.5 w-2.5 shrink-0 rounded-full transition-colors',
                  failed && current
                    ? 'bg-red'
                    : current
                      ? 'bg-blue'
                      : done
                        ? 'bg-green'
                        : 'bg-line',
                )}
              />
              {i < ORDER_MILESTONES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    'hidden h-0.5 flex-1 rounded-full sm:block',
                    done ? 'bg-green/40' : 'bg-line',
                  )}
                />
              )}
            </div>
            <span
              className={clsx(
                'label',
                current ? 'text-ink' : done ? 'text-ink-soft' : 'text-ink-faint',
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

  if (!url) return <span className="label text-ink-faint">{t('common.loading')}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      data-cursor="link"
      className="ul-swipe label text-blue"
    >
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
  const [cancelReason, setCancelReason] = useState('');
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
      <Shell className="max-w-3xl py-40">
        <EmptyState
          title={t('order.notFound')}
          action={
            <ButtonLink to="/dashboard" variant="outline">
              {t('nav.dashboard')}
            </ButtonLink>
          }
        />
      </Shell>
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

      <Shell className="pb-28 pt-14">
        <div className="grid gap-12 lg:grid-cols-[1fr_21rem] lg:gap-16">
          <div className="min-w-0">
            <section aria-labelledby="progress" className="rounded-3xl bg-paper-2 p-7 md:p-8">
              <Eyebrow>
                <span id="progress">{t('order.timeline')}</span>
              </Eyebrow>
              <div className="mt-7">
                <Tracker status={order.status} />
              </div>
              {help !== helpKey && <p className="mt-7 max-w-xl text-ink-soft">{help}</p>}
            </section>

            {/* Quote — the buyer's decision point on a custom build */}
            {order.status === 'quoted' && (
              <section
                aria-labelledby="quote"
                className="mt-10 rounded-3xl bg-amber/8 p-7 md:p-9"
              >
                <p className="label text-amber" id="quote">
                  {t('order.quoteTitle')}
                </p>

                <p className="mt-5 text-d1 font-display leading-none">
                  {formatAzn(order.total_azn, locale)}
                </p>

                <dl className="mt-7 flex flex-col gap-3.5 border-t border-ink/10 pt-6 text-sm">
                  {order.quote_delivery && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-mute">{t('order.quoteDelivery')}</dt>
                      <dd className="font-medium">{formatDate(order.quote_delivery, locale)}</dd>
                    </div>
                  )}
                  {order.deposit_azn !== null && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-mute">{t('order.deposit')}</dt>
                      <dd className="num font-medium">{formatAzn(order.deposit_azn, locale)}</dd>
                    </div>
                  )}
                </dl>

                {order.quote_scope && pickText(order.quote_scope, locale) && (
                  <div className="mt-7">
                    <p className="label mb-2.5 text-ink-mute">{t('order.quoteScope')}</p>
                    <p className="whitespace-pre-line text-ink-soft">
                      {pickText(order.quote_scope, locale)}
                    </p>
                  </div>
                )}

                {order.quote_note && (
                  <div className="mt-6">
                    <p className="label mb-2.5 text-ink-mute">{t('order.quoteNote')}</p>
                    <p className="whitespace-pre-line text-ink-soft">{order.quote_note}</p>
                  </div>
                )}

                {order.quote_expires_at && (
                  <p className="mt-7 text-sm text-ink-mute">
                    {t('order.quoteExpires', {
                      date: formatDate(order.quote_expires_at, locale),
                    })}
                  </p>
                )}

                <div className="mt-8 flex flex-col gap-5">
                  <Button
                    size="lg"
                    className="self-start"
                    disabled={busy}
                    magnetic
                    onClick={() => void call('accept_quote', { p_order_id: order.id })}
                  >
                    {busy && <Spinner />}
                    {t('order.acceptQuote')}
                    {!busy && <Arrow />}
                  </Button>

                  <details className="group">
                    <summary
                      data-cursor="link"
                      className="label cursor-pointer list-none text-ink-mute hover:text-ink"
                    >
                      {t('order.declineQuote')}
                    </summary>
                    <div className="mt-5 flex max-w-lg flex-col gap-4">
                      <Field
                        label={t('order.declineReason')}
                        optional
                        optionalLabel={t('common.optional')}
                      >
                        {({ id: fid }) => (
                          <TextArea
                            id={fid}
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
              <section aria-labelledby="receipts" className="mt-14 border-t border-line pt-12">
                <Eyebrow>
                  <span id="receipts">{t('order.receipt')}</span>
                </Eyebrow>

                <ul className="mt-7 flex flex-col gap-4">
                  {order.payments.map((p) => (
                    <li key={p.id} className="rounded-3xl bg-paper-2 px-6 py-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <span className="num text-lg font-semibold">
                          {formatAzn(p.claimed_amount_azn, locale)}
                        </span>
                        <span className="text-sm text-ink-mute">
                          {t('order.receiptSubmitted', {
                            date: formatDateTime(p.created_at, locale),
                          })}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <span
                          className={clsx(
                            'label rounded-full px-3 py-1.5',
                            p.status === 'confirmed'
                              ? 'bg-green/12 text-green'
                              : p.status === 'rejected'
                                ? 'bg-red/10 text-red'
                                : 'bg-amber/12 text-amber',
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
                        <div className="mt-5 rounded-2xl bg-red/8 px-4 py-3.5">
                          <p className="label text-red">{t('order.rejectedReason')}</p>
                          <p className="mt-2 text-sm text-ink-soft">
                            {p.reject_reason &&
                              t(`admin.rejectReasons.${p.reject_reason}`, p.reject_reason)}
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
              <section
                aria-labelledby="delivery"
                className="mt-10 rounded-3xl bg-blue-wash p-7 md:p-9"
              >
                <p className="label text-blue" id="delivery">
                  {t('order.deliveryTitle')}
                </p>
                <p className="mt-5 text-lg text-ink-soft">{t('order.deliveryBody')}</p>

                {order.delivery_url && (
                  <ButtonLink to={order.delivery_url} external className="mt-7">
                    {t('order.deliveryLink')}
                    <Arrow />
                  </ButtonLink>
                )}

                {order.delivery_notes && (
                  <div className="mt-7">
                    <p className="label mb-2.5 text-ink-mute">{t('order.deliveryFiles')}</p>
                    <p className="whitespace-pre-line text-sm text-ink-soft">
                      {order.delivery_notes}
                    </p>
                  </div>
                )}

                {order.status === 'delivered' && (
                  <Button
                    size="lg"
                    className="mt-8"
                    disabled={busy}
                    magnetic
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
              <section aria-labelledby="review" className="mt-14 border-t border-line pt-12">
                <Eyebrow>
                  <span id="review">{t('reviews.leaveReview')}</span>
                </Eyebrow>

                <fieldset className="mt-7">
                  <legend className="text-sm font-semibold">{t('reviews.yourRating')}</legend>
                  <div className="mt-3.5 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        data-cursor="link"
                        onClick={() => setRating(n)}
                        aria-pressed={rating === n}
                        aria-label={t('reviews.ratingStars', { count: n })}
                        className={clsx(
                          'h-11 w-11 rounded-full text-sm font-semibold transition-colors duration-200',
                          rating >= n
                            ? 'bg-blue text-paper'
                            : 'bg-paper-2 text-ink-mute hover:bg-paper-3',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-7 max-w-xl">
                  <Field
                    label={t('reviews.yourReview')}
                    optional
                    optionalLabel={t('common.optional')}
                  >
                    {({ id: fid }) => (
                      <TextArea
                        id={fid}
                        placeholder={t('reviews.reviewPlaceholder')}
                        value={reviewBody}
                        onChange={(e) => setReviewBody(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <Button
                  className="mt-6"
                  disabled={busy || rating < 1}
                  onClick={() => void submitReview()}
                >
                  {busy && <Spinner />}
                  {t('reviews.submit')}
                </Button>
              </section>
            )}

            {reviewed && (
              <p className="mt-14 flex items-center gap-3 border-t border-line pt-12 font-semibold text-green">
                <Stars rating={rating} />
                {t('reviews.submitted')}
              </p>
            )}
          </div>

          {/* Summary rail */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl bg-paper-2 p-7">
              <dl className="flex flex-col gap-3.5 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-mute">{t('order.placed')}</dt>
                  <dd className="font-medium">{formatDate(order.created_at, locale)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-mute">{t('order.updated')}</dt>
                  <dd className="font-medium">{formatDate(order.updated_at, locale)}</dd>
                </div>
                {order.total_azn !== null && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-mute">{t('order.total')}</dt>
                    <dd className="num font-medium">{formatAzn(order.total_azn, locale)}</dd>
                  </div>
                )}
                {order.paid_azn > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-mute">{t('status.paid')}</dt>
                    <dd className="num font-medium text-green">
                      {formatAzn(order.paid_azn, locale)}
                    </dd>
                  </div>
                )}
              </dl>

              {owesPayment && (
                <ButtonLink to={`/checkout/${order.id}`} size="lg" className="mt-7 w-full">
                  {order.paid_azn > 0 ? t('order.payBalance') : t('order.payNow')}
                  <Arrow />
                </ButtonLink>
              )}

              {!owesPayment && order.status !== 'completed' && order.status !== 'delivered' && (
                <p className="mt-6 border-t border-line pt-5 text-sm text-ink-mute">
                  {t('order.awaitingOwner')}
                </p>
              )}

              {/* Call back — only while the order is still ahead of the receipt
                  stage. Once a receipt is submitted, this disappears. */}
              {canCallBack(order.status) && (
                <details className="group mt-6 border-t border-line pt-5">
                  <summary
                    data-cursor="link"
                    className="label cursor-pointer list-none text-ink-mute transition-colors hover:text-red"
                  >
                    {t('order.callBack')}
                  </summary>
                  <div className="mt-4 flex flex-col gap-4">
                    <p className="text-sm text-ink-mute">{t('order.callBackHint')}</p>
                    <Field
                      label={t('order.callBackReason')}
                      optional
                      optionalLabel={t('common.optional')}
                    >
                      {({ id: cid }) => (
                        <TextArea
                          id={cid}
                          rows={2}
                          placeholder={t('order.callBackReasonPlaceholder')}
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                        />
                      )}
                    </Field>
                    <Button
                      variant="danger"
                      size="sm"
                      className="self-start"
                      disabled={busy}
                      onClick={() =>
                        void call('cancel_order', {
                          p_order_id: order.id,
                          p_reason: cancelReason.trim() || null,
                        })
                      }
                    >
                      {busy && <Spinner />}
                      {t('order.callBackConfirm')}
                    </Button>
                  </div>
                </details>
              )}
            </div>

            {/* Event history, straight from order_events */}
            {order.events.length > 0 && (
              <ol className="mt-5 flex flex-col gap-2.5 px-2">
                {order.events.map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-ink-soft">{t(`status.${event.to_status}`)}</span>
                    <span className="text-ink-faint">{formatDate(event.created_at, locale)}</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </Shell>
    </>
  );
}
