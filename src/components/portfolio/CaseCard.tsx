import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { ManagedImage } from '@/components/media/ManagedImage';
import { pickText } from '@/lib/format';
import type { Locale } from '@/config/site';
import type { CaseStudy } from '@/types/db';

/**
 * A portfolio plate. The whole card is one link, and it declares
 * `data-cursor="view"` — so the cursor swells into a filled cobalt disc
 * reading "Bax" the moment the pointer crosses it. That is the site's loudest
 * interaction, spent on its most important content.
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
  const title = pickText(study.title, locale);

  return (
    <article className={clsx('group', className)}>
      <Link
        to={`/portfolio/${study.slug}`}
        data-cursor="view"
        data-cursor-label={t('portfolio.viewCase')}
        className="block rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-offset-8"
      >
        <ManagedImage
          slotId={`portfolio-${study.slug}-cover`}
          src={study.cover_image}
          alt={title}
          aspect="4:3"
          label={study.slug}
        />

        <div className="mt-6 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h3 className="text-d3 font-display transition-colors duration-300 group-hover:text-blue">
              {title}
            </h3>
            <p className="mt-2.5 max-w-md text-ink-soft">{pickText(study.summary, locale)}</p>
          </div>
          <span className="label mt-2 shrink-0 text-ink-faint">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {(study.industry || study.stack.length > 0) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {study.industry && (
              <span className="label rounded-full bg-paper-2 px-3 py-1.5 text-ink-mute">
                {study.industry}
              </span>
            )}
            {study.stack.slice(0, 3).map((tech) => (
              <span key={tech} className="label rounded-full bg-paper-2 px-3 py-1.5 text-ink-mute">
                {tech}
              </span>
            ))}
            {study.year && (
              <span className="label rounded-full bg-paper-2 px-3 py-1.5 text-ink-mute">
                {study.year}
              </span>
            )}
          </div>
        )}
      </Link>
    </article>
  );
}
