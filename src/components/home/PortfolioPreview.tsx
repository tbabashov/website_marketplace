import { useTranslation } from 'react-i18next';

import { CaseCard } from '@/components/portfolio/CaseCard';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { DemoNotice, EmptyState, Reveal, SectionLabel } from '@/components/ui/Bits';
import type { CaseStudy } from '@/types/db';

/**
 * Two columns with the right-hand one dropped by a third of a plate height, so
 * the grid reads as a set of drawings pinned up rather than as a row of equal
 * cards. Only the top three appear here; the rest live on the portfolio page.
 */
export function PortfolioPreview({
  studies,
  isDemo,
}: {
  studies: CaseStudy[];
  isDemo: boolean;
}) {
  const { t } = useTranslation();
  const shown = studies.slice(0, 4);

  return (
    <section className="px-5 py-24 sm:px-8" aria-labelledby="work-heading">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel>{t('portfolioPreview.label')}</SectionLabel>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="work-heading" className="max-w-2xl font-display text-h1 text-bone">
              {t('portfolioPreview.title')}
            </h2>
            <p className="mt-4 max-w-lg text-lg text-bone-mute">{t('portfolioPreview.lead')}</p>
          </div>
          <ButtonLink to="/portfolio" variant="secondary" className="shrink-0 self-start md:self-auto">
            {t('portfolioPreview.viewAll')}
            <Arrow />
          </ButtonLink>
        </div>

        {isDemo && <DemoNotice className="mt-6" />}

        {shown.length === 0 ? (
          <div className="mt-14">
            <EmptyState title={t('portfolioPreview.empty')} />
          </div>
        ) : (
          <div className="mt-16 grid gap-x-10 gap-y-20 md:grid-cols-2">
            {shown.map((study, index) => (
              <Reveal
                key={study.id}
                delay={(index % 2) * 90}
                // The offset is what makes this a pinned-up wall rather than a
                // grid; it collapses below md, where a stagger reads as a bug.
                className={index % 2 === 1 ? 'md:mt-24' : undefined}
              >
                <CaseCard study={study} index={index} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
