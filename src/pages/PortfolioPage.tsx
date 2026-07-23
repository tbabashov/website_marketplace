import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { CaseCard } from '@/components/portfolio/CaseCard';
import { Button } from '@/components/ui/Button';
import { DemoNotice, EmptyState, LoadingBlock, Reveal, Shell } from '@/components/ui/Bits';
import { fetchCaseStudies } from '@/lib/api';
import { useSeo } from '@/lib/seo';
import type { CaseStudy } from '@/types/db';

function FilterGroup({
  label,
  options,
  active,
  onChange,
  allLabel,
}: {
  label: string;
  options: string[];
  active: string | null;
  onChange: (next: string | null) => void;
  allLabel: string;
}) {
  if (options.length === 0) return null;

  const pill = (selected: boolean) =>
    clsx(
      'label rounded-full px-3.5 py-2 transition-colors duration-200',
      selected ? 'bg-blue text-paper' : 'bg-paper-2 text-ink-mute hover:bg-paper-3 hover:text-ink',
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label mr-1 text-ink-faint">{label}</span>
      <button
        type="button"
        data-cursor="link"
        onClick={() => onChange(null)}
        aria-pressed={active === null}
        className={pill(active === null)}
      >
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-cursor="link"
          onClick={() => onChange(active === option ? null : option)}
          aria-pressed={active === option}
          className={pill(active === option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function PortfolioPage() {
  const { t } = useTranslation();
  useSeo({ title: t('seo.portfolio.title'), description: t('seo.portfolio.description') });

  const [studies, setStudies] = useState<CaseStudy[] | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [industry, setIndustry] = useState<string | null>(null);
  const [tech, setTech] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchCaseStudies().then(({ data, isDemo: demo }) => {
      if (!alive) return;
      setStudies(data);
      setIsDemo(demo);
    });
    return () => {
      alive = false;
    };
  }, []);

  const industries = useMemo(
    () => [...new Set((studies ?? []).map((s) => s.industry).filter(Boolean))] as string[],
    [studies],
  );
  const techs = useMemo(() => [...new Set((studies ?? []).flatMap((s) => s.stack))], [studies]);

  const filtered = useMemo(
    () =>
      (studies ?? []).filter(
        (s) => (!industry || s.industry === industry) && (!tech || s.stack.includes(tech)),
      ),
    [studies, industry, tech],
  );

  return (
    <>
      <PageHead
        label={`${t('nav.portfolio')} — ${filtered.length}`}
        title={t('portfolio.pageTitle')}
        lead={t('portfolio.lead')}
      />

      <Shell className="pb-28 pt-16">
        <div className="flex flex-col gap-4">
          <FilterGroup
            label={t('portfolio.filterIndustry')}
            options={industries}
            active={industry}
            onChange={setIndustry}
            allLabel={t('portfolio.filterAll')}
          />
          <FilterGroup
            label={t('portfolio.filterTech')}
            options={techs}
            active={tech}
            onChange={setTech}
            allLabel={t('portfolio.filterAll')}
          />
        </div>

        {isDemo && <DemoNotice className="mt-8" />}

        {studies === null ? (
          <LoadingBlock />
        ) : filtered.length === 0 ? (
          <div className="mt-16">
            <EmptyState
              title={t('portfolio.empty')}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setIndustry(null);
                    setTech(null);
                  }}
                >
                  {t('portfolio.clearFilters')}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-16 grid gap-x-10 gap-y-20 md:mt-20 md:grid-cols-2">
            {filtered.map((study, i) => (
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
    </>
  );
}
