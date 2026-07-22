import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { PageHead } from '@/components/layout/PageHead';
import { CaseCard } from '@/components/portfolio/CaseCard';
import { Button } from '@/components/ui/Button';
import { DemoNotice, EmptyState, LoadingBlock, Reveal } from '@/components/ui/Bits';
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

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="spec text-bone-faint">{label}</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={active === null}
        className={clsx(
          'spec rounded-[2px] border px-2.5 py-1.5 transition-colors',
          active === null
            ? 'border-cyan text-cyan-bright'
            : 'border-rule-soft text-bone-faint hover:border-rule hover:text-bone',
        )}
      >
        {allLabel}
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(active === option ? null : option)}
          aria-pressed={active === option}
          className={clsx(
            'spec rounded-[2px] border px-2.5 py-1.5 transition-colors',
            active === option
              ? 'border-cyan text-cyan-bright'
              : 'border-rule-soft text-bone-faint hover:border-rule hover:text-bone',
          )}
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
  const techs = useMemo(
    () => [...new Set((studies ?? []).flatMap((s) => s.stack))],
    [studies],
  );

  const filtered = useMemo(() => {
    return (studies ?? []).filter(
      (s) =>
        (!industry || s.industry === industry) && (!tech || s.stack.includes(tech)),
    );
  }, [studies, industry, tech]);

  return (
    <>
      <PageHead
        label={`${t('nav.portfolio')} / ${filtered.length}`}
        title={t('portfolio.pageTitle')}
        lead={t('portfolio.lead')}
      />

      <div className="px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
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

          {isDemo && <DemoNotice className="mt-6" />}

          {studies === null ? (
            <LoadingBlock />
          ) : filtered.length === 0 ? (
            <div className="mt-14">
              <EmptyState
                title={t('portfolio.empty')}
                action={
                  <Button
                    variant="secondary"
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
            <div className="mt-16 grid gap-x-10 gap-y-20 pb-24 md:grid-cols-2">
              {filtered.map((study, index) => (
                <Reveal
                  key={study.id}
                  delay={(index % 2) * 80}
                  className={index % 2 === 1 ? 'md:mt-24' : undefined}
                >
                  <CaseCard study={study} index={index} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
