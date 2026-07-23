import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PageHead } from '@/components/layout/PageHead';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { EmptyState, LoadingBlock, StatusPill } from '@/components/ui/Bits';
import { fetchMyOrders } from '@/lib/api';
import { formatAzn, formatDate, pickText } from '@/lib/format';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import type { Locale } from '@/config/site';
import { BUYER_ACTION_STATES, OPEN_ORDER_STATES, type Order } from '@/types/db';

function OrderRow({ order }: { order: Order }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const needsYou = BUYER_ACTION_STATES.includes(order.status);

  return (
    <li className="border-b border-line first:border-t">
      <Link
        to={`/orders/${order.id}`}
        className="group grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label text-blue">{order.ref}</span>
            <StatusPill status={order.status} />
            {needsYou && (
              <span className="label rounded-full bg-amber/15 px-2 py-1 text-amber">
                {t('dashboard.actionNeeded')}
              </span>
            )}
          </div>

          <p className="mt-3 font-display text-d4 text-ink transition-colors group-hover:text-blue">
            {pickText(order.title, locale) || t('order.customBuild')}
          </p>

          <p className="label mt-2 text-ink-mute">
            {t('order.placed')} {formatDate(order.created_at, locale)}
          </p>
        </div>

        <div className="flex items-center gap-6 sm:justify-end">
          {order.total_azn !== null && (
            <span className="num text-sm text-ink tabular-nums">
              {formatAzn(order.total_azn, locale)}
            </span>
          )}
          <span className="label inline-flex items-center gap-2 text-blue">
            {t('dashboard.viewOrder')}
            <Arrow className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  useSeo({ title: `${t('dashboard.pageTitle')} — WebSale.az`, description: t('dashboard.lead'), noindex: true });

  const userId = useAuth((s) => s.user?.id ?? null);
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void fetchMyOrders(userId).then((rows) => {
      if (alive) setOrders(rows);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const active = (orders ?? []).filter((o) => OPEN_ORDER_STATES.includes(o.status));
  const past = (orders ?? []).filter((o) => !OPEN_ORDER_STATES.includes(o.status));

  return (
    <>
      <PageHead
        label={t('nav.dashboard')}
        title={t('dashboard.pageTitle')}
        lead={t('dashboard.lead')}
        aside={
          <ButtonLink to="/request" variant="outline">
            {t('nav.request')}
          </ButtonLink>
        }
      />

      <div className="px-5 py-12 pb-24 md:px-10">
        <div className="mx-auto max-w-[1440px]">
          {orders === null ? (
            <LoadingBlock />
          ) : orders.length === 0 ? (
            <EmptyState
              title={t('dashboard.noOrders')}
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink to="/marketplace">{t('dashboard.noOrdersAction')}</ButtonLink>
                  <ButtonLink to="/request" variant="outline">
                    {t('dashboard.noRequestsAction')}
                  </ButtonLink>
                </div>
              }
            />
          ) : (
            <>
              {active.length > 0 && (
                <section aria-labelledby="active-heading">
                  <h2 id="active-heading" className="label text-blue">
                    {t('dashboard.active')} / {active.length}
                  </h2>
                  <ul className="mt-6">
                    {active.map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </ul>
                </section>
              )}

              {past.length > 0 && (
                <section aria-labelledby="past-heading" className="mt-16">
                  <h2 id="past-heading" className="label text-ink-mute">
                    {t('dashboard.past')} / {past.length}
                  </h2>
                  <ul className="mt-6">
                    {past.map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
