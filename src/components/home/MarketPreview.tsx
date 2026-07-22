import { useTranslation } from 'react-i18next';

import { ListingRow } from '@/components/marketplace/ListingRow';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { DemoNotice, EmptyState, Reveal, SectionLabel } from '@/components/ui/Bits';
import type { Listing } from '@/types/db';

export function MarketPreview({ listings, isDemo }: { listings: Listing[]; isDemo: boolean }) {
  const { t } = useTranslation();
  const shown = listings.filter((l) => l.status === 'published').slice(0, 3);

  return (
    <section
      className="border-t border-rule-soft px-5 py-24 sm:px-8"
      aria-labelledby="market-heading"
    >
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel>{t('marketPreview.label')}</SectionLabel>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="market-heading" className="max-w-2xl font-display text-h1 text-bone">
              {t('marketPreview.title')}
            </h2>
            <p className="mt-4 max-w-xl text-lg text-bone-mute">{t('marketPreview.lead')}</p>
          </div>
          <ButtonLink to="/marketplace" variant="secondary" className="shrink-0 self-start md:self-auto">
            {t('marketPreview.viewAll')}
            <Arrow />
          </ButtonLink>
        </div>

        {isDemo && <DemoNotice className="mt-6" />}

        {shown.length === 0 ? (
          <div className="mt-12">
            <EmptyState title={t('marketPreview.empty')} />
          </div>
        ) : (
          <Reveal className="mt-12">
            {shown.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}
