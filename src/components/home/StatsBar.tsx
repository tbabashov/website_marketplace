import { useTranslation } from 'react-i18next';

import { Reveal } from '@/components/ui/Bits';
import { stats } from '@/config/site';

/**
 * Laid out as a dimension line rather than as stat cards: one rule running the
 * width of the section with tick marks under each measurement.
 *
 * Any figure the Owner has not supplied renders as an em dash with "not filled
 * in yet" underneath. Nothing here is invented — a fabricated "50+ sites
 * shipped" on a one-person studio's landing page is exactly the tell this
 * build is trying to avoid.
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
    <section className="border-y border-rule-soft px-5 py-14 sm:px-8" aria-labelledby="stats-heading">
      <div className="mx-auto max-w-[1400px]">
        <h2 id="stats-heading" className="spec text-bone-faint">
          {t('stats.label')}
        </h2>

        <Reveal className="mt-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {rows.map((row, index) => (
              <div key={row.label} className="relative">
                {/* The tick that anchors this measurement to the rule below. */}
                <div className="flex items-end gap-2">
                  <span className="font-display text-h1 tabular-nums text-bone">
                    {row.value ?? '—'}
                  </span>
                  {row.value && row.suffix && (
                    <span className="spec pb-3 text-bone-faint">{row.suffix}</span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="h-2 w-px bg-cyan" aria-hidden="true" />
                  <span className="h-px flex-1 bg-rule" aria-hidden="true" />
                  <span className="spec text-bone-faint tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <p className="mt-3 text-sm text-bone-mute">{row.label}</p>
                {!row.value && (
                  <p className="spec mt-1 text-brass/70">{t('common.notFilledIn')}</p>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {anyMissing && (
          <p className="spec mt-10 text-bone-faint/60">{t('stats.ownerNote')}</p>
        )}
      </div>
    </section>
  );
}
