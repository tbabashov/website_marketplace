import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { Gallery, type GalleryImage } from '@/components/media/Gallery';
import { ListingRow } from '@/components/marketplace/ListingRow';
import { Arrow, Button, ButtonLink } from '@/components/ui/Button';
import {
  DemoNotice,
  EmptyState,
  Eyebrow,
  LoadingBlock,
  Reveal,
  Shell,
  Spinner,
} from '@/components/ui/Bits';
import { fetchListing, fetchListings } from '@/lib/api';
import { formatAzn, formatSecondary, pickText } from '@/lib/format';
import { applyPercent, effectivePrice, hasDiscount } from '@/lib/pricing';
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

  // Promo code, entered before the order is created (the total is locked in at
  // creation). We only trust the server's re-validation, but previewing here
  // lets the buyer see the effect before committing.
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const depositAvailable = payment.depositPercent > 0 && payment.depositPercent < 100;

  useEffect(() => {
    let alive = true;

    void fetchListing(slug).then(({ data, isDemo: demo }) => {
      if (!alive) return;
      setListing(data);
      setIsDemo(demo);
    });
    void fetchListings().then(({ data }) => {
      if (alive) {
        setOthers(data.filter((l) => l.slug !== slug && l.status === 'published').slice(0, 3));
      }
    });

    return () => {
      alive = false;
    };
  }, [slug]);

  const title = listing ? pickText(listing.title, locale) : t('market.pageTitle');

  /**
   * The gallery: the listing's screenshots, and only those. The cover image is
   * a standalone summary shot — it's the marketplace card thumbnail and does
   * not belong in the preview carousel. When a listing has no screenshots yet,
   * three labelled placeholder slots stand in — the caption names the file to
   * drop in (e.g. "vitrin/screenshot-1-hero"), the same drop-in-and-it-appears
   * convention used across the site. Fill the listing's `screenshots` text[]
   * column with the real paths afterward.
   */
  const galleryImages: GalleryImage[] = useMemo(() => {
    if (!listing) return [];
    if (listing.screenshots.length > 0) {
      return listing.screenshots.map((src, i) => ({
        src,
        label: `${listing.slug} — ${i + 1}`,
        alt: `${title} — ${i + 1}`,
      }));
    }
    // Suggested screenshot slots. Rename freely — these labels are only a
    // hint about what each screen might show.
    return ['hero', 'features', 'mobile'].map((name, i) => ({
      src: null,
      label: `${listing.slug}/screenshot-${i + 1}-${name}`,
    }));
  }, [listing, title]);

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
      p_promo_code: promo?.code ?? null,
    });
    setBuying(false);

    if (error) {
      toast(readableError(error), 'bad');
      return;
    }

    const order = (Array.isArray(data) ? data[0] : data) as Order | null;
    if (order?.id) navigate(`/checkout/${order.id}`);
  }

  async function applyPromo() {
    const code = promoInput.trim();
    setPromoError(null);
    if (!code) return;
    if (!supabase) {
      setPromoError(t('market.promoInvalid'));
      return;
    }
    setPromoBusy(true);
    const { data, error } = await supabase.rpc('validate_promo', { p_code: code });
    setPromoBusy(false);
    const row = (Array.isArray(data) ? data[0] : data) as
      | { code: string; percent_off: number }
      | undefined;
    if (error || !row) {
      setPromo(null);
      setPromoError(t('market.promoInvalid'));
      return;
    }
    setPromo({ code: row.code, percent: row.percent_off });
  }

  function clearPromo() {
    setPromo(null);
    setPromoInput('');
    setPromoError(null);
  }

  if (listing === undefined) return <LoadingBlock />;

  if (listing === null) {
    return (
      <Shell className="max-w-3xl py-40">
        <EmptyState
          title={t('market.notFound')}
          action={
            <ButtonLink to="/marketplace" variant="outline">
              {t('nav.marketplace')}
            </ButtonLink>
          }
        />
      </Shell>
    );
  }

  const included = t('market.includedItems', { returnObjects: true }) as string[];
  const discounted = hasDiscount(listing);
  const basePrice = effectivePrice(listing); // after the listing's own discount
  const finalPrice = promo ? applyPercent(basePrice, promo.percent) : basePrice;
  const secondary = formatSecondary(finalPrice, locale);
  const depositAmount = Math.round((finalPrice * payment.depositPercent) / 100);
  const sold = listing.status === 'sold';

  return (
    <>
      <Shell className="pt-36 md:pt-44">
        <Link
          to="/marketplace"
          data-cursor="link"
          className="ul-swipe label text-ink-mute hover:text-ink"
        >
          ← {t('nav.marketplace')}
        </Link>

        <div className="mt-10 grid grid-cols-1 gap-14 lg:grid-cols-[1.55fr_1fr] lg:gap-20">
          <div>
            <h1 className="fade-up text-d1 font-display">{title}</h1>
            <p
              className="fade-up mt-6 max-w-2xl text-xl text-ink-soft"
              style={{ '--d': '120ms' } as React.CSSProperties}
            >
              {pickText(listing.tagline, locale)}
            </p>

            {isDemo && <DemoNotice className="mt-6" />}

            <Gallery images={galleryImages} aspect="16:10" className="mt-12" />

            {listing.screenshots.length > 0 && (
              <p className="mt-4 text-center text-sm text-ink-mute">{t('market.screenshots')}</p>
            )}

            <div className="mt-14 border-t border-line pt-12">
              <p className="max-w-2xl text-xl leading-relaxed text-ink-soft">
                {pickText(listing.description, locale)}
              </p>
            </div>

            {pickText(listing.best_for, locale) && (
              <div className="mt-12 grid grid-cols-1 gap-5 border-t border-line pt-12 lg:grid-cols-[14rem_1fr] lg:gap-12">
                <h2 className="label pt-1.5 text-blue">{t('market.bestFor')}</h2>
                <p className="max-w-2xl text-lg text-ink-soft">
                  {pickText(listing.best_for, locale)}
                </p>
              </div>
            )}

            <div className="mt-12 grid grid-cols-1 gap-5 border-t border-line pt-12 lg:grid-cols-[14rem_1fr] lg:gap-12">
              <h2 className="label pt-1.5 text-blue">{t('market.included')}</h2>
              <ul className="flex max-w-2xl flex-col gap-4">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3.5 text-lg text-ink-soft">
                    <svg
                      viewBox="0 0 16 16"
                      width="18"
                      height="18"
                      aria-hidden="true"
                      className="mt-1.5 shrink-0 text-blue"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8.5l3.5 3.5L13 4.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 border-y border-line py-12 lg:grid-cols-[14rem_1fr] lg:gap-12">
              <h2 className="label pt-1.5 text-blue">{t('market.license')}</h2>
              <div className="max-w-2xl">
                <p className="text-lg font-semibold">{t('market.licenseSingle')}</p>
                <p className="mt-3 text-ink-soft">{t('market.licenseSingleNote')}</p>
              </div>
            </div>
          </div>

          {/* Buy panel. Sticky on desktop so the price stays with you while you
              read the specification. */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl bg-paper-2 p-7 md:p-8">
              {(discounted || promo) && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="label text-ink-faint line-through">
                    {formatAzn(listing.price_azn, locale)}
                  </span>
                  {discounted && (
                    <span className="label rounded-full bg-blue px-2 py-0.5 text-paper">
                      −{listing.discount_percent}%
                    </span>
                  )}
                  {promo && (
                    <span className="label rounded-full bg-green/15 px-2 py-0.5 text-green">
                      {promo.code} −{promo.percent}%
                    </span>
                  )}
                </div>
              )}
              <p
                className={clsx(
                  'text-d1 font-display leading-none',
                  discounted || promo ? 'text-blue' : 'text-ink',
                )}
              >
                {formatAzn(finalPrice, locale)}
              </p>
              {secondary && <p className="label mt-3 text-ink-mute">≈ {secondary}</p>}

              <dl className="mt-8 flex flex-col gap-3.5 border-t border-line pt-6 text-sm">
                {listing.page_count !== null && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-mute">{t('market.pages')}</dt>
                    <dd className="num font-medium">{listing.page_count}</dd>
                  </div>
                )}
                {listing.stack.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-mute">{t('market.stack')}</dt>
                    <dd className="text-right font-medium">{listing.stack.join(' · ')}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-mute">{t('market.license')}</dt>
                  <dd className="text-right font-medium">{t('market.licenseSingle')}</dd>
                </div>
              </dl>

              {sold ? (
                <div className="mt-7 rounded-2xl bg-paper p-5">
                  <p className="label text-ink-mute">{t('market.sold')}</p>
                  <p className="mt-2 text-sm text-ink-soft">{t('market.soldNote')}</p>
                </div>
              ) : (
                <>
                  {depositAvailable && (
                    <label
                      data-cursor="link"
                      className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl bg-paper p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-blue"
                    >
                      <input
                        type="checkbox"
                        checked={useDeposit}
                        onChange={(e) => setUseDeposit(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#1B33E0]"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          {t('checkout.payDeposit', { percent: payment.depositPercent })}
                        </span>
                        <span className="mt-1 block text-xs text-ink-mute">
                          {formatAzn(depositAmount, locale)} · {t('checkout.balanceLater')}{' '}
                          {formatAzn(finalPrice - depositAmount, locale)}
                        </span>
                      </span>
                    </label>
                  )}

                  {/* Promo code. Applied before the order exists, because the
                      order snapshots its total the moment it is created. */}
                  <div className="mt-5">
                    {promo ? (
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-green/10 px-4 py-3">
                        <span className="text-sm text-ink">
                          <span className="font-semibold">{promo.code}</span> ·{' '}
                          {t('market.promoApplied', { percent: promo.percent })}
                        </span>
                        <button
                          type="button"
                          data-cursor="link"
                          onClick={clearPromo}
                          className="label text-ink-mute hover:text-ink"
                        >
                          {t('common.close')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <label htmlFor="promo" className="label text-ink-mute">
                          {t('market.promoLabel')}
                        </label>
                        <div className="mt-2 flex gap-2">
                          <input
                            id="promo"
                            type="text"
                            autoCapitalize="characters"
                            spellCheck={false}
                            placeholder={t('market.promoPlaceholder')}
                            value={promoInput}
                            onChange={(e) => {
                              setPromoInput(e.target.value);
                              setPromoError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void applyPromo();
                              }
                            }}
                            className="min-w-0 flex-1 rounded-2xl border border-line bg-field px-4 py-2.5 text-sm uppercase placeholder:normal-case placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-blue"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={promoBusy || !promoInput.trim()}
                            onClick={() => void applyPromo()}
                          >
                            {promoBusy ? <Spinner /> : t('market.promoApply')}
                          </Button>
                        </div>
                        {promoError && (
                          <p className="mt-2 text-sm font-medium text-red">{promoError}</p>
                        )}
                      </>
                    )}
                  </div>

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
                      variant="outline"
                      className="mt-3 w-full"
                    >
                      {t('market.liveDemo')}
                    </ButtonLink>
                  )}
                </>
              )}

              <p className="mt-6 text-xs leading-relaxed text-ink-mute">{t('checkout.noCardData')}</p>
            </div>
          </aside>
        </div>
      </Shell>

      {others.length > 0 && (
        <section className="pb-28 pt-12" aria-labelledby="similar-heading">
          <Shell>
            <Eyebrow>
              <span id="similar-heading">{t('market.similar')}</span>
            </Eyebrow>
            <div className="mt-10 grid gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
              {others.map((other, i) => (
                <Reveal key={other.id} delay={i * 90}>
                  <ListingRow listing={other} />
                </Reveal>
              ))}
            </div>
          </Shell>
        </section>
      )}
    </>
  );
}
