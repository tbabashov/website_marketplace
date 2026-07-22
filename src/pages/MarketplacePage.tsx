import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { ListingRow } from '@/components/marketplace/ListingRow';
import { DemoNotice, EmptyState, LoadingBlock } from '@/components/ui/Bits';
import { fetchListings } from '@/lib/api';
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
    if (sort === 'priceAsc') sorted.sort((a, b) => a.price_azn - b.price_azn);
    if (sort === 'priceDesc') sorted.sort((a, b) => b.price_azn - a.price_azn);
    // Sold listings drop to the bottom whatever the sort — they are reference,
    // not offers.
    return sorted.sort((a, b) => Number(a.status === 'sold') - Number(b.status === 'sold'));
  }, [listings, category, sort]);

  return (
    <>
      <PageHead
        label={`${t('nav.marketplace')} / ${shown.length}`}
        title={t('market.pageTitle')}
        lead={t('market.lead')}
      />

      <div className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col gap-5 border-b border-rule-soft pb-6 lg:flex-row lg:items-center lg:justify-between">
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="spec text-bone-faint">{t('market.filterCategory')}</span>
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  aria-pressed={category === null}
                  className={clsx(
                    'spec rounded-[2px] border px-2.5 py-1.5 transition-colors',
                    category === null
                      ? 'border-cyan text-cyan-bright'
                      : 'border-rule-soft text-bone-faint hover:border-rule hover:text-bone',
                  )}
                >
                  {t('portfolio.filterAll')}
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(category === c ? null : c)}
                    aria-pressed={category === c}
                    className={clsx(
                      'spec rounded-[2px] border px-2.5 py-1.5 transition-colors',
                      category === c
                        ? 'border-cyan text-cyan-bright'
                        : 'border-rule-soft text-bone-faint hover:border-rule hover:text-bone',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <label className="flex items-center gap-3">
              <span className="spec text-bone-faint">{t('market.sortLabel')}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-[2px] border border-rule-soft bg-ink-deep px-3 py-2 text-sm text-bone hover:border-rule focus:border-cyan focus:outline-none"
              >
                <option value="newest">{t('market.sortNewest')}</option>
                <option value="priceAsc">{t('market.sortPriceAsc')}</option>
                <option value="priceDesc">{t('market.sortPriceDesc')}</option>
              </select>
            </label>
          </div>

          {isDemo && <DemoNotice className="mt-6" />}

          {listings === null ? (
            <LoadingBlock />
          ) : shown.length === 0 ? (
            <div className="mt-12 pb-24">
              <EmptyState title={t('market.empty')} />
            </div>
          ) : (
            <div className="pb-24">
              {shown.map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
