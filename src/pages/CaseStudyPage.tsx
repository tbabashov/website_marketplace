import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ManagedImage } from '@/components/media/ManagedImage';
import { Arrow, ButtonLink } from '@/components/ui/Button';
import { EmptyState, LoadingBlock, Reveal } from '@/components/ui/Bits';
import { fetchCaseStudies, fetchCaseStudy } from '@/lib/api';
import { pickText } from '@/lib/format';
import { useSeo } from '@/lib/seo';
import type { Locale } from '@/config/site';
import type { CaseStudy } from '@/types/db';

/** problem → built → outcome, in that order, because that is the story. */
function StoryBlock({ label, body, index }: { label: string; body: string; index: number }) {
  if (!body) return null;

  return (
    <Reveal delay={index * 70} className="grid gap-4 border-t border-rule-soft py-10 lg:grid-cols-[14rem_1fr] lg:gap-12">
      <h2 className="spec pt-1 text-cyan">{label}</h2>
      <p className="max-w-2xl text-lg leading-relaxed text-bone-mute">{body}</p>
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
      setNext(i >= 0 ? data[(i + 1) % data.length] ?? null : (data[0] ?? null));
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
      <div className="mx-auto max-w-3xl px-5 py-32">
        <EmptyState
          title={t('portfolio.notFound')}
          action={
            <ButtonLink to="/portfolio" variant="secondary">
              {t('portfolio.backToPortfolio')}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <article>
      <header className="px-5 pt-14 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Link to="/portfolio" className="spec text-bone-faint hover:text-cyan">
            ← {t('portfolio.backToPortfolio')}
          </Link>

          <h1 className="mt-8 max-w-4xl font-display text-display text-bone">{title}</h1>
          {summary && <p className="mt-6 max-w-2xl text-lg text-bone-mute">{summary}</p>}

          <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-rule-soft py-6 sm:grid-cols-4">
            {study.client && (
              <div>
                <dt className="spec text-bone-faint">{t('portfolio.industry')}</dt>
                <dd className="mt-2 text-sm text-bone">{study.client}</dd>
              </div>
            )}
            {study.industry && (
              <div>
                <dt className="spec text-bone-faint">{t('portfolio.industry')}</dt>
                <dd className="mt-2 text-sm text-bone">{study.industry}</dd>
              </div>
            )}
            {study.year && (
              <div>
                <dt className="spec text-bone-faint">{t('portfolio.year')}</dt>
                <dd className="mt-2 font-mono text-sm text-bone tabular-nums">{study.year}</dd>
              </div>
            )}
            {study.stack.length > 0 && (
              <div>
                <dt className="spec text-bone-faint">{t('portfolio.stack')}</dt>
                <dd className="mt-2 text-sm text-bone">{study.stack.join(' · ')}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <div className="px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="cropmarks">
            <ManagedImage
              slotId={`portfolio-${study.slug}-cover`}
              src={study.cover_image}
              aspect="3:2"
              label={study.slug}
              priority
              className="border border-rule-soft"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <StoryBlock label={t('portfolio.problem')} body={pickText(study.problem, locale)} index={0} />
          <StoryBlock label={t('portfolio.built')} body={pickText(study.built, locale)} index={1} />
          <StoryBlock label={t('portfolio.outcome')} body={pickText(study.outcome, locale)} index={2} />

          {study.gallery.length > 0 && (
            <div className="grid gap-6 border-t border-rule-soft py-10 sm:grid-cols-2">
              {study.gallery.map((path, i) => (
                <ManagedImage
                  key={path}
                  src={path}
                  aspect="3:2"
                  alt=""
                  label={`${study.slug}-${i + 1}`}
                  className="border border-rule-soft"
                />
              ))}
            </div>
          )}

          {study.live_url && (
            <div className="border-t border-rule-soft py-10">
              <ButtonLink to={study.live_url} external variant="secondary" size="lg">
                {t('portfolio.liveDemo')}
                <Arrow />
              </ButtonLink>
            </div>
          )}
        </div>
      </div>

      {next && next.slug !== study.slug && (
        <nav className="border-t border-rule px-5 py-14 sm:px-8" aria-label={t('portfolio.nextCase')}>
          <div className="mx-auto max-w-[1400px]">
            <span className="spec text-bone-faint">{t('portfolio.nextCase')}</span>
            <Link
              to={`/portfolio/${next.slug}`}
              className="group mt-4 flex items-baseline gap-4 font-display text-h1 text-bone transition-colors hover:text-cyan-bright"
            >
              {pickText(next.title, locale)}
              <Arrow className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </nav>
      )}
    </article>
  );
}
