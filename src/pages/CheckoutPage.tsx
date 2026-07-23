import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PageHead } from '@/components/layout/PageHead';
import { Arrow, Button, ButtonLink } from '@/components/ui/Button';
import { Field, TextArea, TextInput } from '@/components/ui/Form';
import { CopyValue, EmptyState, LoadingBlock, Spinner } from '@/components/ui/Bits';
import { fetchOrder } from '@/lib/api';
import { formatAzn, formatCardNumber, formatIban, pickText } from '@/lib/format';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import { hasPaymentDetails, IS_PLACEHOLDER, payment as payConfig, type Locale } from '@/config/site';
import type { OrderDetail, PaymentKind } from '@/types/db';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export default function CheckoutPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  const user = useAuth((s) => s.user);
  const toast = useUI((s) => s.toast);

  useSeo({ title: `${t('checkout.pageTitle')} — WebSale.az`, description: t('checkout.lead'), noindex: true });

  const [order, setOrder] = useState<OrderDetail | null | undefined>(undefined);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void fetchOrder(id).then((data) => {
      if (alive) setOrder(data);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  /**
   * What is owed right now. A deposit order asks for the deposit until it has
   * been confirmed, then for whatever is left — so the buyer never has to work
   * out the arithmetic themselves.
   */
  const due = useMemo(() => {
    if (!order) return { amount: 0, kind: 'full' as PaymentKind };

    const total = order.total_azn ?? 0;
    const paid = order.paid_azn ?? 0;

    if (order.deposit_azn && paid <= 0) {
      return { amount: order.deposit_azn, kind: 'deposit' as PaymentKind };
    }
    if (paid > 0 && paid < total) {
      return { amount: total - paid, kind: 'balance' as PaymentKind };
    }
    return { amount: total - paid, kind: 'full' as PaymentKind };
  }, [order]);

  useEffect(() => {
    if (due.amount > 0 && !amount) setAmount(String(due.amount));
  }, [due.amount, amount]);

  function chooseFile(next: File | null) {
    setErrors((e) => ({ ...e, file: undefined }));
    if (!next) {
      setFile(null);
      return;
    }
    if (!ACCEPTED.includes(next.type)) {
      setErrors((e) => ({ ...e, file: t('checkout.errors.fileType') }));
      return;
    }
    if (next.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, file: t('checkout.errors.fileSize') }));
      return;
    }
    setFile(next);
  }

  async function submit() {
    if (!order || !user || !supabase) return;

    const next: Partial<Record<string, string>> = {};
    if (!file) next.file = t('checkout.errors.file');
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) next.amount = t('checkout.errors.amount');
    setErrors(next);
    if (Object.keys(next).length > 0 || !file) return;

    setBusy(true);

    // Path shape matters: the storage policy checks that the first segment is
    // the uploader's own user id.
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/${order.ref}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setBusy(false);
      toast(t('checkout.errors.upload'), 'bad');
      return;
    }

    const { error } = await supabase.rpc('submit_payment', {
      p_order_id: order.id,
      p_kind: due.kind,
      p_amount: parsed,
      p_receipt_path: path,
      p_paid_at: paidAt || null,
      p_note: note.trim() || null,
    });

    setBusy(false);

    if (error) {
      toast(readableError(error), 'bad');
      return;
    }

    toast(t('checkout.submitted'));
    navigate(`/orders/${order.id}`, { replace: true });
  }

  if (order === undefined) return <LoadingBlock />;

  if (order === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-40">
        <EmptyState
          title={t('order.notFound')}
          action={
            <ButtonLink to="/dashboard" variant="outline">
              {t('nav.dashboard')}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const detailsReady = hasPaymentDetails();

  return (
    <>
      <PageHead
        label={`${t('order.reference')} ${order.ref}`}
        title={t('checkout.pageTitle')}
        lead={t('checkout.lead')}
      />

      <div className="px-6 py-14 md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1fr_23rem] lg:gap-16">
          <div className="max-w-2xl">
            {/* 1 — where the money goes */}
            <section aria-labelledby="pay-to">
              <h2 id="pay-to" className="label text-blue">
                {t('checkout.sendTo')}
              </h2>

              {!detailsReady ? (
                <p className="mt-4 rounded-2xl bg-amber/10 px-4 py-3.5 text-sm text-ink-soft">
                  {t('checkout.detailsMissing')}
                </p>
              ) : (
                <div className="mt-5 rounded-3xl bg-paper-2">
                  {payConfig.bankName !== IS_PLACEHOLDER && (
                    <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
                      <span className="label text-ink-mute">{t('checkout.bank')}</span>
                      <span className="text-sm text-ink">{payConfig.bankName}</span>
                    </div>
                  )}
                  {payConfig.accountHolder !== IS_PLACEHOLDER && (
                    <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
                      <span className="label text-ink-mute">{t('checkout.accountHolder')}</span>
                      <span className="text-sm text-ink">{payConfig.accountHolder}</span>
                    </div>
                  )}
                  {payConfig.cardNumber !== IS_PLACEHOLDER && (
                    <div className="border-b border-line px-5 py-4">
                      <p className="label mb-2 text-ink-mute">{t('checkout.cardNumber')}</p>
                      <CopyValue
                        value={payConfig.cardNumber.replace(/\s/g, '')}
                        display={formatCardNumber(payConfig.cardNumber)}
                      />
                    </div>
                  )}
                  {payConfig.iban !== IS_PLACEHOLDER && (
                    <div className="border-b border-line px-5 py-4">
                      <p className="label mb-2 text-ink-mute">{t('checkout.iban')}</p>
                      <CopyValue
                        value={payConfig.iban.replace(/\s/g, '')}
                        display={formatIban(payConfig.iban)}
                      />
                    </div>
                  )}
                  {payConfig.wallets && (
                    <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                      <span className="label text-ink-mute">{t('checkout.wallets')}</span>
                      <span className="text-sm text-ink">{payConfig.wallets}</span>
                    </div>
                  )}
                </div>
              )}

              {/* The reference is the single most important field on the page —
                  it is what matches a transfer to this order. */}
              <div className="mt-5 rounded-3xl bg-blue-wash px-5 py-5">
                <p className="label mb-3 text-blue">{t('checkout.reference')}</p>
                <CopyValue value={order.ref} display={order.ref} />
                <p className="mt-3 text-sm text-ink-soft">{t('checkout.referenceHelp')}</p>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-ink-mute">
                {t('checkout.noCardData')}
              </p>
            </section>

            {/* 2 — proof of transfer */}
            <section aria-labelledby="upload" className="mt-14 border-t border-line pt-12">
              <h2 id="upload" className="label text-blue">
                {t('checkout.uploadTitle')}
              </h2>
              <p className="mt-3 text-sm text-ink-soft">{t('checkout.uploadHelp')}</p>

              <div className="mt-6 flex flex-col gap-6">
                <div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept={ACCEPTED.join(',')}
                    onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                    id="receipt-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInput.current?.click()}
                  >
                    {file ? t('checkout.uploadChange') : t('checkout.uploadAction')}
                  </Button>
                  {file && (
                    <p className="mt-3 num text-xs text-green">
                      {t('checkout.uploadedFile', { name: file.name })}
                    </p>
                  )}
                  {errors.file && <p className="mt-3 text-sm text-red">{errors.file}</p>}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label={t('checkout.amountPaid')} error={errors.amount}>
                    {({ id, describedBy, invalid }) => (
                      <TextInput
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        aria-describedby={describedBy}
                        invalid={invalid}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label={t('checkout.paidAt')}>
                    {({ id }) => (
                      <TextInput
                        id={id}
                        type="date"
                        value={paidAt}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setPaidAt(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <Field label={t('checkout.noteLabel')} optional optionalLabel={t('common.optional')}>
                  {({ id }) => (
                    <TextArea
                      id={id}
                      rows={3}
                      placeholder={t('checkout.notePlaceholder')}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  )}
                </Field>

                <Button size="lg" className="self-start" onClick={() => void submit()} disabled={busy}>
                  {busy && <Spinner />}
                  {busy ? t('checkout.submitting') : t('checkout.submit')}
                  {!busy && <Arrow />}
                </Button>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-paper-2 p-6">
              <h2 className="label text-ink-mute">{t('checkout.orderSummary')}</h2>

              <p className="mt-4 font-display text-d4 text-ink">
                {pickText(order.title, locale) || t('order.customBuild')}
              </p>

              <dl className="mt-6 border-t border-line pt-5">
                {order.total_azn !== null && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="label text-ink-mute">{t('order.total')}</dt>
                    <dd className="num text-sm text-ink tabular-nums">
                      {formatAzn(order.total_azn, locale)}
                    </dd>
                  </div>
                )}
                {order.paid_azn > 0 && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="label text-ink-mute">{t('order.deposit')}</dt>
                    <dd className="num text-sm text-green tabular-nums">
                      {formatAzn(order.paid_azn, locale)}
                    </dd>
                  </div>
                )}
                {due.kind === 'deposit' && order.deposit_azn !== null && order.total_azn !== null && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="label text-ink-mute">{t('checkout.balanceLater')}</dt>
                    <dd className="num text-sm text-ink-soft tabular-nums">
                      {formatAzn(order.total_azn - order.deposit_azn, locale)}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-5 border-t border-line pt-5">
                <p className="label text-blue">{t('checkout.amountDue')}</p>
                <p className="mt-2 font-display text-d2 tabular-nums">
                  {formatAzn(due.amount, locale)}
                </p>
              </div>

              {due.kind === 'deposit' && (
                <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-mute">
                  {t('checkout.depositExplain', {
                    percent: Math.round(((order.deposit_azn ?? 0) / (order.total_azn || 1)) * 100),
                  })}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
