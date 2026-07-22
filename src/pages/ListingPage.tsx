import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ManagedImage } from '@/components/media/ManagedImage';
import { ListingRow } from '@/components/marketplace/ListingRow';
import { Arrow, Button, ButtonLink } from '@/components/ui/Button';
import { DemoNotice, EmptyState, LoadingBlock, Spinner } from '@/components/ui/Bits';
import { fetchListing, fetchListings } from '@/lib/api';
import { formatAzn, formatSecondary, pickText } from '@/lib/format';
import { readableError, supabase } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { useAuth } from '@/store/auth';
import { useUI } from '@/store/ui';
import { payment, type Locale } from '@/config/site';
import type { Listing, Order } from '@/types/db';

export default function ListingPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  const user = useAuth((s) => s.user);
  const toast = useUI((s) => s.toast);

  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [others, setOthers] = useState<Listing[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [useDeposit, setUseDeposit] = useState(false);
  const [buying, setBuying] = useState(false);

  const depositAvailable = payment.depositPercent > 0 && payment.depositPercent < 100;

  useEffect(() => {
    let alive = true;

    void fetchListing(slug).then(({ data, isDemo: demo }) => {
      if (!alive) return;
      setListing(data);
      setIsDemo(demo);
    });
    void fetchListings().then(({ data }) => {
      if (alive) setOthers(data.filter((l) => l.slug !== slug && l.status === 'published').slice(0, 2));
    });

    return () => {
      alive = false;
    };
  }, [slug]);

  const title = listing ? pickText(listing.title, locale) : t('market.pageTitle');

  useSeo({
    title: `${title} — WebSale.az`,
    description: listing ? pickText(listing.tagline, locale) : t('seo.market.description'),
    image: listing?.cover_image ?? null,
  });

  async function buy() {
    if (!listing) return;

    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(`/marketplace/${slug}`)}`);
      return;
    }
    if (!supabase) {
      toast(t('auth.notConfigured'), 'bad');
      return;
    }

    setBuying(true);
    const { data, error } = await supabase.rpc('create_listing_order', {
      p_listing_id: listing.id,
      p_use_deposit: useDeposit,
      p_deposit_percent: payment.depositPercent,
    });
    setBuying(false);

    if (error) {
      toast(readableError(error), 'bad');
      return;
    }

    const order = (Array.isArray(data) ? data[0] : data) as Order | null;
    if (order?.id) navigate(`/checkout/${order.id}`);
  }

  if (listing === undefined) return <LoadingBlock />;

  if (listing === null) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-32">
        <EmptyState
          title={t('market.notFound')}
          action={
            <ButtonLink to="/marketplace" variant="secondary">
              {t('nav.marketplace')}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const included = t('market.includedItems', { returnObjects: true }) as string[];
  const secondary = formatSecondary(listing.price_azn, locale);
  const depositAmount = Math.round((listing.price_azn * payment.depositPercent) / 100);
  const sold = listing.status === 'sold';

  return (
    <>
      <div className="px-5 pt-14 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Link to="/marketplace" className="spec text-bone-faint hover:text-cyan">
            ← {t('nav.marketplace')}
          </Link>
        </div>
      </div>

      <div className="px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div>
            <h1 className="font-display text-display text-bone">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg text-bone-mute">
              {pickText(listing.tagline, locale)}
            </p>

            {isDemo && <DemoNotice className="mt-5" />}

            <div className="cropmarks mt-10">
              <ManagedImage
                slotId={`marketplace-${listing.slug}-cover`}
                src={listing.cover_image}
                aspect="16:10"
                label={listing.slug}
                priority
                className="border border-rule-soft"
              />
            </div>

            <div className="mt-12 border-t border-rule-soft pt-10">
              <p className="max-w-2xl text-lg leading-relaxed text-bone-mute">
                {pickText(listing.description, locale)}
              </p>
            </div>

            {pickText(listing.best_for, locale) && (
              <div className="mt-10 grid gap-4 border-t border-rule-soft pt-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
                <h2 className="spec pt-1 text-cyan">{t('market.bestFor')}</h2>
                <p className="max-w-2xl text-bone-mute">{pickText(listing.best_for, locale)}</p>
              </div>
            )}

            <div className="mt-10 grid gap-4 border-t border-rule-soft pt-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
              <h2 className="spec pt-1 text-cyan">{t('market.included')}</h2>
              <ul className="flex max-w-2xl flex-col gap-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-bone-mute">
                    <span className="mt-2.5 h-px w-4 shrink-0 bg-cyan-dim" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 grid gap-4 border-y border-rule-soft py-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
              <h2 className="spec pt-1 text-cyan">{t('market.license')}</h2>
              <div className="max-w-2xl">
                <p className="text-bone">{t('market.licenseSingle')}</p>
                <p className="mt-2 text-sm text-bone-mute">{t('market.licenseSingleNote')}</p>
              </div>
            </div>
          </div>

          {/* Buy panel. Sticks on desktop so the price stays with you as you
              read down the specification. */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-rule bg-surface p-6 sm:p-7">
              <p className="font-display text-h1 text-bone tabular-nums">
                {formatAzn(listing.price_azn, locale)}
              </p>
              {secondary && <p className="spec mt-2 text-bone-faint">≈ {secondary}</p>}

              <dl className="mt-6 border-t border-rule-soft pt-5">
                {listing.page_count !== null && (
                  <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5">
                    <dt className="spec text-bone-faint">{t('market.pages')}</dt>
                    <dd className="font-mono text-xs text-bone tabular-nums">{listing.page_count}</dd>
                  </div>
                )}
                {listing.stack.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5">
                    <dt className="spec text-bone-faint">{t('market.stack')}</dt>
                    <dd className="text-right font-mono text-xs text-bone">
                      {listing.stack.join(' · ')}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="spec text-bone-faint">{t('market.license')}</dt>
                  <dd className="text-right font-mono text-xs text-bone">
                    {t('market.licenseSingle')}
                  </dd>
                </div>
              </dl>

              {sold ? (
                <div className="mt-6 border border-rule px-4 py-4">
                  <p className="spec text-bone-faint">{t('market.sold')}</p>
                  <p className="mt-2 text-sm text-bone-mute">{t('market.soldNote')}</p>
                </div>
              ) : (
                <>
                  {depositAvailable && (
                    <label className="mt-6 flex cursor-pointer items-start gap-3 border border-rule-soft p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan">
                      <input
                        type="checkbox"
                        checked={useDeposit}
                        onChange={(e) => setUseDeposit(e.target.checked)}
                        className="mt-1 accent-[#4fb6c4]"
                      />
                      <span>
                        <span className="text-sm text-bone">
                          {t('checkout.payDeposit', { percent: payment.depositPercent })}
                        </span>
                        <span className="mt-1 block text-xs text-bone-faint">
                          {formatAzn(depositAmount, locale)} ·{' '}
                          {t('checkout.balanceLater')}{' '}
                          {formatAzn(listing.price_azn - depositAmount, locale)}
                        </span>
                      </span>
                    </label>
                  )}

                  <Button
                    size="lg"
                    className="mt-6 w-full"
                    onClick={() => void buy()}
                    disabled={buying}
                  >
                    {buying ? <Spinner /> : null}
                    {t('market.buy')}
                    {!buying && <Arrow />}
                  </Button>

                  {listing.demo_url && (
                    <ButtonLink
                      to={listing.demo_url}
                      external
                      variant="secondary"
                      className="mt-3 w-full"
                    >
                      {t('market.liveDemo')}
                    </ButtonLink>
                  )}
                </>
              )}

              <p className="mt-5 text-xs leading-relaxed text-bone-faint">
                {t('checkout.noCardData')}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {others.length > 0 && (
        <section className="border-t border-rule px-5 py-16 sm:px-8" aria-labelledby="similar-heading">
          <div className="mx-auto max-w-[1400px]">
            <h2 id="similar-heading" className="spec text-bone-faint">
              {t('market.similar')}
            </h2>
            <div className="mt-8">
              {others.map((other) => (
                <ListingRow key={other.id} listing={other} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
