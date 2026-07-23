import { useTranslation } from 'react-i18next';

import { ListingRow } from '@/components/marketplace/ListingRow';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { DemoNotice, Eyebrow, Reveal, Shell } from '@/components/ui/Bits';
import type { Listing } from '@/types/db';

/**
 * The single inverted band on the page. Going to night here does two things:
 * it breaks a long run of paper before the reader tires of it, and it makes
 * the ready-made sites feel like a distinct offer rather than more of the same
 * page. Rounded off at both ends so it reads as an inset panel, not a stripe.
 */
export function MarketPreview({ listings, isDemo }: { listings: Listing[]; isDemo: boolean }) {
  const { t } = useTranslation();
  const shown = listings.filter((l) => l.status === 'published').slice(0, 3);

  return (
    <section className="px-3 py-8 md:px-5" aria-labelledby="market-heading">
      <div className="rounded-[2rem] bg-night py-24 text-paper md:rounded-[2.75rem] md:py-32">
        <Shell>
          <Eyebrow tone="paper">{t('marketPreview.label')}</Eyebrow>

          <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="market-heading" className="max-w-3xl text-d1 font-display text-paper">
                {t('marketPreview.title')}
              </h2>
              <p className="mt-6 max-w-xl text-xl text-paper/60">{t('marketPreview.lead')}</p>
            </div>
            <ButtonLink
              to="/marketplace"
              variant="onNight"
              className="shrink-0 self-start md:self-auto"
            >
              {t('marketPreview.viewAll')}
              <Arrow />
            </ButtonLink>
          </div>

          {isDemo && <DemoNotice className="mt-8" />}

          {shown.length === 0 ? (
            <div className="mt-16 rounded-3xl bg-night-2 px-8 py-20 text-center">
              <p className="font-display text-d3 text-paper">{t('marketPreview.empty')}</p>
            </div>
          ) : (
            <div className="mt-16 grid gap-x-8 gap-y-16 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((listing, i) => (
                <Reveal key={listing.id} delay={i * 100}>
                  <ListingRow listing={listing} tone="paper" />
                </Reveal>
              ))}
            </div>
          )}
        </Shell>
      </div>
    </section>
  );
}
