import { useTranslation } from 'react-i18next';

import { Reveal, Shell } from '@/components/ui/Bits';
import { stats } from '@/config/site';

/**
 * Numbers set at display scale, in a row, with nothing around them. No cards,
 * no icons, no borders — at this size the figure is the graphic.
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
    <section className="py-24 md:py-32" aria-labelledby="stats-heading">
      <Shell>
        <h2 id="stats-heading" className="sr-only">
          {t('stats.label')}
        </h2>

        <div className="grid grid-cols-2 gap-x-8 gap-y-14 lg:grid-cols-4">
          {rows.map((row, i) => (
            <Reveal key={row.label} delay={i * 90}>
              <p className="flex items-baseline gap-2">
                <span className="text-d1 font-display font-extrabold tabular-nums">
                  {row.value ?? '—'}
                </span>
                {row.value && row.suffix && (
                  <span className="text-sm font-semibold text-blue">{row.suffix}</span>
                )}
              </p>
              <p className="mt-3 text-sm text-ink-soft">{row.label}</p>
              {!row.value && <p className="label mt-1.5 text-amber">{t('common.notFilledIn')}</p>}
            </Reveal>
          ))}
        </div>

        {anyMissing && <p className="mt-14 text-sm text-ink-faint">{t('stats.ownerNote')}</p>}
      </Shell>
    </section>
  );
}
