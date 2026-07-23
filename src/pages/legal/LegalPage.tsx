import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { PageHead } from '@/components/layout/PageHead';
import { Shell } from '@/components/ui/Bits';
import { Arrow } from '@/components/ui/Button';
import { useSeo } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/config/site';

type Doc = 'terms' | 'privacy' | 'refund';

interface Section {
  h: string;
  b: string;
}

/**
 * The date these documents were last written. A constant rather than
 * `new Date()`, so the page does not claim to have been updated today every
 * time somebody loads it.
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
          <span className="label text-ink-mute">
            {t('legal.lastUpdated', { date: formatDate(LAST_UPDATED, locale) })}
          </span>
        }
      />

      <Shell className="py-20 md:py-28">
        <ol className="max-w-4xl">
          {sections.map((section, i) => (
            <li key={section.h} className="border-t border-line py-9 first:border-t-0 first:pt-0">
              <div className="grid gap-4 lg:grid-cols-[3rem_1fr] lg:gap-8">
                <span aria-hidden="true" className="label pt-1.5 text-blue tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2 className="text-d4 font-display">{section.h}</h2>
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{section.b}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <nav aria-label={t('footer.legalHeading')} className="mt-16 flex flex-wrap gap-8">
          {OTHER_DOCS[doc].map((other) => (
            <Link
              key={other}
              to={`/${other}`}
              data-cursor="link"
              className="group/btn inline-flex items-center gap-2 font-semibold text-blue"
            >
              {t(`footer.${other}`)}
              <Arrow />
            </Link>
          ))}
        </nav>
      </Shell>
    </>
  );
}
