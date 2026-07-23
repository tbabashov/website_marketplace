import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { Reveal, Shell } from '@/components/ui/Bits';
import { stats } from '@/config/site';

/**
 * Four measurements in a row, centred in their cells and divided by hairlines,
 * so the group reads as a single instrument panel rather than four loose
 * numbers. The dividers run between columns only — never on the outside edges,
 * which would box the section in.
 *
 * Any figure the Owner has not supplied renders as a dash with "not filled in
 * yet" beneath it. Nothing here is ever invented: a fabricated number on a
 * one-person studio's landing page is the fastest way to lose a reader.
 */
export function StatsBar() {
  const { t } = useTranslation();

  const rows = [
    { value: stats.sitesShipped, label: t('stats.sitesShipped'), suffix: '' },
    { value: stats.industries, label: t('stats.industries'), suffix: '' },
    {
      value: stats.avgTurnaroundWeeks,
      label: t('stats.turnaround'),
      suffix: t('stats.turnaroundUnit'),
    },
    { value: stats.yearsBuilding, label: t('stats.years'), suffix: '' },
  ];

  const anyMissing = rows.some((row) => !row.value);

  return (
    <section className="py-20 md:py-28" aria-labelledby="stats-heading">
      <Shell>
        <h2 id="stats-heading" className="sr-only">
          {t('stats.label')}
        </h2>

        <div className="rounded-3xl bg-paper-2 px-4 py-12 md:px-8 md:py-14">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {rows.map((row, i) => (
              <Reveal
                key={row.label}
                delay={i * 90}
                className={clsx(
                  'flex flex-col items-center px-4 py-6 text-center md:px-6',
                  // Rules sit between cells only. The pattern differs by
                  // breakpoint because the grid rewraps from 4-up to 2-up.
                  'border-line',
                  i % 2 === 1 && 'border-l lg:border-l',
                  i >= 2 && 'border-t lg:border-t-0',
                  i === 2 && 'lg:border-l',
                )}
              >
                <dd className="flex items-baseline gap-1.5">
                  <span className="text-d1 font-display font-extrabold tabular-nums">
                    {row.value ?? '—'}
                  </span>
                  {row.value && row.suffix && (
                    <span className="text-sm font-semibold text-blue">{row.suffix}</span>
                  )}
                </dd>
                <dt className="mt-3 text-sm text-ink-soft">{row.label}</dt>
                {!row.value && <p className="label mt-2 text-amber">{t('common.notFilledIn')}</p>}
              </Reveal>
            ))}
          </dl>
        </div>

        {anyMissing && (
          <p className="mt-6 text-center text-sm text-ink-mute">{t('stats.ownerNote')}</p>
        )}
      </Shell>
    </section>
  );
}
