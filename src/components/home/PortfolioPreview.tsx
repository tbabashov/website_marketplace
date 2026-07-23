import { useTranslation } from 'react-i18next';

import { CaseCard } from '@/components/portfolio/CaseCard';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { DemoNotice, EmptyState, Eyebrow, Reveal, Shell } from '@/components/ui/Bits';
import type { CaseStudy } from '@/types/db';

/**
 * The first work you see. A two-column grid where the right column is pushed
 * down by a third of a plate, so the eye moves diagonally instead of scanning
 * two flat rows. The offset collapses below `md`, where a stagger just reads
 * as a mistake.
 */
export function PortfolioPreview({ studies, isDemo }: { studies: CaseStudy[]; isDemo: boolean }) {
  const { t } = useTranslation();
  const shown = studies.slice(0, 4);

  return (
    <section className="py-24 md:py-32" aria-labelledby="work-heading">
      <Shell>
        <Eyebrow>{t('portfolioPreview.label')}</Eyebrow>

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="work-heading" className="max-w-3xl text-d1 font-display">
              {t('portfolioPreview.title')}
            </h2>
            <p className="mt-6 max-w-lg text-xl text-ink-soft">{t('portfolioPreview.lead')}</p>
          </div>
          <ButtonLink to="/portfolio" variant="outline" className="shrink-0 self-start md:self-auto">
            {t('portfolioPreview.viewAll')}
            <Arrow />
          </ButtonLink>
        </div>

        {isDemo && <DemoNotice className="mt-8" />}

        {shown.length === 0 ? (
          <div className="mt-16">
            <EmptyState title={t('portfolioPreview.empty')} />
          </div>
        ) : (
          <div className="mt-16 grid gap-x-10 gap-y-20 md:mt-20 md:grid-cols-2">
            {shown.map((study, i) => (
              <Reveal
                key={study.id}
                delay={(i % 2) * 110}
                className={i % 2 === 1 ? 'md:mt-28' : undefined}
              >
                <CaseCard study={study} index={i} />
              </Reveal>
            ))}
          </div>
        )}
      </Shell>
    </section>
  );
}
