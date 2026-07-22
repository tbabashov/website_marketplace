import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { ManagedImage } from '@/components/media/ManagedImage';
import { pickText } from '@/lib/format';
import type { Locale } from '@/config/site';
import type { CaseStudy } from '@/types/db';

/**
 * A portfolio plate. The index and the year sit on a rule above the image the
 * way a drawing numbers its figures; the crop marks pick up the accent on
 * hover and focus, so the whole card reads as one target rather than the title
 * being the only live thing on it.
 */
export function CaseCard({
  study,
  index,
  className,
}: {
  study: CaseStudy;
  index: number;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  return (
    <article className={clsx('group', className)}>
      <Link
        to={`/portfolio/${study.slug}`}
        className="block focus-visible:outline-none"
        aria-labelledby={`case-${study.id}-title`}
      >
        <div className="flex items-center gap-3 pb-3">
          <span className="spec tabular-nums text-cyan">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="h-px flex-1 bg-rule-soft transition-colors group-hover:bg-cyan-dim" />
          {study.year && <span className="spec text-bone-faint">{study.year}</span>}
        </div>

        <div className="cropmarks transition-transform duration-500 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-cyan">
          <ManagedImage
            slotId={`portfolio-${study.slug}-cover`}
            src={study.cover_image}
            // Case studies added after this manifest was written have no slot,
            // so the alt text comes from the row rather than being left empty
            // — an empty alt would mark a content image as decorative.
            alt={pickText(study.title, locale)}
            aspect="3:2"
            label={study.slug}
            className="border border-rule-soft transition-colors duration-300 group-hover:border-rule"
          />
        </div>

        <h3
          id={`case-${study.id}-title`}
          className="mt-5 font-display text-h3 text-bone transition-colors group-hover:text-cyan-bright"
        >
          {pickText(study.title, locale)}
        </h3>

        <p className="mt-2 max-w-md text-sm text-bone-mute">{pickText(study.summary, locale)}</p>

        {(study.industry || study.stack.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {study.industry && (
              <span className="spec text-bone-faint">{study.industry}</span>
            )}
            {study.stack.slice(0, 3).map((tech) => (
              <span key={tech} className="spec text-bone-faint/70">
                {tech}
              </span>
            ))}
          </div>
        )}
      </Link>

      {study.live_url && (
        <a
          href={study.live_url}
          target="_blank"
          rel="noreferrer noopener"
          className="spec mt-4 inline-flex text-cyan hover:text-cyan-bright"
        >
          {t('portfolio.liveDemo')}
          <span className="sr-only"> ({t('a11y.openInNewTab')})</span>
        </a>
      )}
    </article>
  );
}
