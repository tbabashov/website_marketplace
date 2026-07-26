import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { ListingRow } from '@/components/marketplace/ListingRow';
import { Select } from '@/components/ui/Form';
import { DemoNotice, EmptyState, LoadingBlock, Reveal, Shell } from '@/components/ui/Bits';
import { fetchListings } from '@/lib/api';
import { effectivePrice } from '@/lib/pricing';
import { useSeo } from '@/lib/seo';
import type { Listing } from '@/types/db';

type Sort = 'newest' | 'priceAsc' | 'priceDesc';

export default function MarketplacePage() {
  const { t } = useTranslation();
  useSeo({ title: t('seo.market.title'), description: t('seo.market.description') });

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [sort, setSort] = useState<Sort>('newest');
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchListings().then(({ data, isDemo: demo }) => {
      if (!alive) return;
      setListings(data);
      setIsDemo(demo);
    });
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set((listings ?? []).map((l) => l.category).filter(Boolean))] as string[],
    [listings],
  );

  const shown = useMemo(() => {
    const rows = (listings ?? []).filter((l) => !category || l.category === category);
    const sorted = [...rows];
    // Sort by what a buyer actually pays, not the pre-discount list price.
    if (sort === 'priceAsc') sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'priceDesc') sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    // Sold listings drop to the bottom whatever the sort — they are reference,
    // not offers.
    return sorted.sort((a, b) => Number(a.status === 'sold') - Number(b.status === 'sold'));
  }, [listings, category, sort]);

  const pill = (selected: boolean) =>
    clsx(
      'label rounded-full px-3.5 py-2 transition-colors duration-200',
      selected ? 'bg-blue text-paper' : 'bg-paper-2 text-ink-mute hover:bg-paper-3 hover:text-ink',
    );

  return (
    <>
      <PageHead
        label={`${t('nav.marketplace')} — ${shown.length}`}
        title={t('market.pageTitle')}
        lead={t('market.lead')}
      />

      <Shell className="pb-28 pt-14">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-cursor="link"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={pill(category === null)}
              >
                {t('portfolio.filterAll')}
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-cursor="link"
                  onClick={() => setCategory(category === c ? null : c)}
                  aria-pressed={category === c}
                  className={pill(category === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <label className="flex shrink-0 items-center gap-3">
            <span className="label text-ink-faint">{t('market.sortLabel')}</span>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-full py-2 pl-4 text-sm font-medium"
            >
              <option value="newest">{t('market.sortNewest')}</option>
              <option value="priceAsc">{t('market.sortPriceAsc')}</option>
              <option value="priceDesc">{t('market.sortPriceDesc')}</option>
            </Select>
          </label>
        </div>

        {isDemo && <DemoNotice className="mt-8" />}

        {listings === null ? (
          <LoadingBlock />
        ) : shown.length === 0 ? (
          <div className="mt-16">
            <EmptyState title={t('market.empty')} />
          </div>
        ) : (
          <div className="mt-14 grid gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((listing, i) => (
              <Reveal key={listing.id} delay={(i % 3) * 90}>
                <ListingRow listing={listing} />
              </Reveal>
            ))}
          </div>
        )}
      </Shell>
    </>
  );
}
