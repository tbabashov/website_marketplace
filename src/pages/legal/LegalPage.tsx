import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { PageHead } from '@/components/layout/PageHead';
import { useSeo } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/config/site';

type Doc = 'terms' | 'privacy' | 'refund';

interface Section {
  h: string;
  b: string;
}

/**
 * The date these documents were last written. Kept as a constant rather than
 * `new Date()` so the page does not claim to have been updated today every
 * time someone loads it.
 */
const LAST_UPDATED = '2026-01-15';

const OTHER_DOCS: Record<Doc, Doc[]> = {
  terms: ['privacy', 'refund'],
  privacy: ['terms', 'refund'],
  refund: ['terms', 'privacy'],
};

export default function LegalPage({ doc }: { doc: Doc }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  const title = t(`legal.${doc}.title`);
  const intro = t(`legal.${doc}.intro`);
  const sections = t(`legal.${doc}.sections`, { returnObjects: true }) as Section[];

  useSeo({ title: `${title} — WebSale.az`, description: intro });

  return (
    <>
      <PageHead
        label={t('footer.legalHeading')}
        title={title}
        lead={intro}
        aside={
          <span className="spec text-bone-faint">
            {t('legal.lastUpdated', { date: formatDate(LAST_UPDATED, locale) })}
          </span>
        }
      />

      <div className="px-5 py-14 pb-24 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <ol className="max-w-4xl">
            {sections.map((section, index) => (
              <li
                key={section.h}
                className="grid gap-3 border-b border-rule-soft py-8 lg:grid-cols-[3rem_14rem_1fr] lg:gap-8"
              >
                <span className="spec pt-1 tabular-nums text-cyan">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="font-display text-h4 text-bone">{section.h}</h2>
                <p className="max-w-2xl leading-relaxed text-bone-mute">{section.b}</p>
              </li>
            ))}
          </ol>

          <nav aria-label={t('footer.legalHeading')} className="mt-14 flex flex-wrap gap-6">
            {OTHER_DOCS[doc].map((other) => (
              <Link key={other} to={`/${other}`} className="spec text-cyan hover:text-cyan-bright">
                {t(`footer.${other}`)} →
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
