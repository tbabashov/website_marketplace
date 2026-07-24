import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ManagedImage } from '@/components/media/ManagedImage';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { EmptyState, Eyebrow, LoadingBlock, Reveal, Shell } from '@/components/ui/Bits';
import { fetchCaseStudies, fetchCaseStudy } from '@/lib/api';
import { pickText } from '@/lib/format';
import { useSeo } from '@/lib/seo';
import type { Locale } from '@/config/site';
import type { CaseStudy } from '@/types/db';

/** problem → built → outcome, in that order, because that is the story. */
function StoryBlock({ label, body, index }: { label: string; body: string; index: number }) {
  if (!body) return null;

  return (
    <Reveal
      delay={index * 80}
      className="grid grid-cols-1 gap-5 border-t border-line py-12 lg:grid-cols-[14rem_1fr] lg:gap-16"
    >
      <h2 className="label pt-2 text-blue">{label}</h2>
      <p className="max-w-2xl text-xl leading-relaxed text-ink-soft">{body}</p>
    </Reveal>
  );
}

export default function CaseStudyPage() {
  const { slug = '' } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  const [study, setStudy] = useState<CaseStudy | null | undefined>(undefined);
  const [next, setNext] = useState<CaseStudy | null>(null);

  useEffect(() => {
    let alive = true;

    void fetchCaseStudy(slug).then(({ data }) => {
      if (alive) setStudy(data);
    });
    void fetchCaseStudies().then(({ data }) => {
      if (!alive) return;
      const i = data.findIndex((c) => c.slug === slug);
      setNext(i >= 0 ? (data[(i + 1) % data.length] ?? null) : (data[0] ?? null));
    });

    return () => {
      alive = false;
    };
  }, [slug]);

  const title = study ? pickText(study.title, locale) : t('portfolio.pageTitle');
  const summary = study ? pickText(study.summary, locale) : '';

  useSeo({
    title: `${title} — WebSale.az`,
    description: summary || t('seo.portfolio.description'),
    image: study?.cover_image ?? null,
    type: 'article',
  });

  if (study === undefined) return <LoadingBlock />;

  if (study === null) {
    return (
      <Shell className="max-w-3xl py-40">
        <EmptyState
          title={t('portfolio.notFound')}
          action={
            <ButtonLink to="/portfolio" variant="outline">
              {t('portfolio.backToPortfolio')}
            </ButtonLink>
          }
        />
      </Shell>
    );
  }

  return (
    <article>
      <Shell className="pt-36 md:pt-44">
        <Link to="/portfolio" data-cursor="link" className="ul-swipe label text-ink-mute hover:text-ink">
          ← {t('portfolio.backToPortfolio')}
        </Link>

        <h1 className="fade-up mt-10 max-w-5xl text-d1 font-display">{title}</h1>
        {summary && (
          <p
            className="fade-up mt-7 max-w-2xl text-xl text-ink-soft"
            style={{ '--d': '120ms' } as React.CSSProperties}
          >
            {summary}
          </p>
        )}

        <dl className="mt-14 flex flex-wrap gap-3">
          {study.client && (
            <div className="rounded-full bg-paper-2 px-4 py-2.5">
              <dt className="sr-only">{t('portfolio.industry')}</dt>
              <dd className="text-sm font-medium">{study.client}</dd>
            </div>
          )}
          {study.industry && (
            <div className="rounded-full bg-paper-2 px-4 py-2.5">
              <dt className="sr-only">{t('portfolio.industry')}</dt>
              <dd className="text-sm font-medium">{study.industry}</dd>
            </div>
          )}
          {study.year && (
            <div className="rounded-full bg-paper-2 px-4 py-2.5">
              <dt className="sr-only">{t('portfolio.year')}</dt>
              <dd className="num text-sm font-medium">{study.year}</dd>
            </div>
          )}
          {study.stack.length > 0 && (
            <div className="rounded-full bg-paper-2 px-4 py-2.5">
              <dt className="sr-only">{t('portfolio.stack')}</dt>
              <dd className="text-sm font-medium">{study.stack.join(' · ')}</dd>
            </div>
          )}
        </dl>

        <div className="group mt-12">
          <ManagedImage
            slotId={`portfolio-${study.slug}-cover`}
            src={study.cover_image}
            alt={title}
            aspect="3:2"
            label={study.slug}
            priority
          />
        </div>
      </Shell>

      <Shell className="pb-8 pt-16">
        <StoryBlock label={t('portfolio.problem')} body={pickText(study.problem, locale)} index={0} />
        <StoryBlock label={t('portfolio.built')} body={pickText(study.built, locale)} index={1} />
        <StoryBlock label={t('portfolio.outcome')} body={pickText(study.outcome, locale)} index={2} />

        {study.gallery.length > 0 && (
          <div className="grid gap-6 border-t border-line py-12 sm:grid-cols-2">
            {study.gallery.map((path, i) => (
              <ManagedImage
                key={path}
                src={path}
                aspect="3:2"
                alt=""
                label={`${study.slug}-${i + 1}`}
              />
            ))}
          </div>
        )}

        {study.live_url && (
          <div className="border-t border-line py-12">
            <ButtonLink to={study.live_url} external variant="outline" size="lg">
              {t('portfolio.liveDemo')}
              <Arrow />
            </ButtonLink>
          </div>
        )}
      </Shell>

      {next && next.slug !== study.slug && (
        <nav className="px-3 pb-8 md:px-5" aria-label={t('portfolio.nextCase')}>
          <div className="rounded-[2rem] bg-night py-20 md:rounded-[2.75rem] md:py-28">
            <Shell>
              <Eyebrow tone="paper">{t('portfolio.nextCase')}</Eyebrow>
              <Link
                to={`/portfolio/${next.slug}`}
                data-cursor="view"
                data-cursor-label={t('portfolio.viewCase')}
                className="group/btn mt-6 flex flex-wrap items-baseline gap-6 text-d1 font-display text-paper transition-colors hover:text-blue-lift"
              >
                {pickText(next.title, locale)}
                <Arrow className="h-6 w-6" />
              </Link>
            </Shell>
          </div>
        </nav>
      )}
    </article>
  );
}
