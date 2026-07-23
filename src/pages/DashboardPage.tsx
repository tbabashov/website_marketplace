import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PageHead } from '@/components/layout/PageHead';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { EmptyState, Eyebrow, LoadingBlock, Shell, StatusPill } from '@/components/ui/Bits';
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
    <li>
      <Link
        to={`/orders/${order.id}`}
        data-cursor="link"
        className="group/btn grid gap-5 rounded-3xl bg-paper-2 p-6 transition-colors duration-300 hover:bg-paper-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 md:p-7"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="num text-sm font-semibold text-blue">{order.ref}</span>
            <StatusPill status={order.status} />
            {needsYou && (
              <span className="label rounded-full bg-blue px-3 py-1.5 text-paper">
                {t('dashboard.actionNeeded')}
              </span>
            )}
          </div>

          <p className="mt-4 text-d4 font-display transition-colors duration-300 group-hover/btn:text-blue">
            {pickText(order.title, locale) || t('order.customBuild')}
          </p>

          <p className="mt-2 text-sm text-ink-mute">
            {t('order.placed')} {formatDate(order.created_at, locale)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-6 sm:justify-end">
          {order.total_azn !== null && (
            <span className="num text-lg font-semibold">
              {formatAzn(order.total_azn, locale)}
            </span>
          )}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-colors group-hover/btn:bg-blue">
            <Arrow />
            <span className="sr-only">{t('dashboard.viewOrder')}</span>
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  useSeo({
    title: `${t('dashboard.pageTitle')} — WebSale.az`,
    description: t('dashboard.lead'),
    noindex: true,
  });

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
            <Arrow />
          </ButtonLink>
        }
      />

      <Shell className="pb-28 pt-14">
        {orders === null ? (
          <LoadingBlock />
        ) : orders.length === 0 ? (
          <EmptyState
            title={t('dashboard.noOrders')}
            action={
              <>
                <ButtonLink to="/marketplace">{t('dashboard.noOrdersAction')}</ButtonLink>
                <ButtonLink to="/request" variant="outline">
                  {t('dashboard.noRequestsAction')}
                </ButtonLink>
              </>
            }
          />
        ) : (
          <>
            {active.length > 0 && (
              <section aria-labelledby="active-heading">
                <Eyebrow>
                  <span id="active-heading">
                    {t('dashboard.active')} — {active.length}
                  </span>
                </Eyebrow>
                <ul className="mt-7 flex flex-col gap-4">
                  {active.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </ul>
              </section>
            )}

            {past.length > 0 && (
              <section aria-labelledby="past-heading" className="mt-16">
                <Eyebrow>
                  <span id="past-heading">
                    {t('dashboard.past')} — {past.length}
                  </span>
                </Eyebrow>
                <ul className="mt-7 flex flex-col gap-4">
                  {past.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </Shell>
    </>
  );
}
