import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Arrow, ButtonLink } from '@/components/ui/Button';
import { ManagedImage } from '@/components/media/ManagedImage';
import { LOCALE_LABELS, site, type Locale } from '@/config/site';

/**
 * The signature moment: the hero is drawn as a sheet from a technical drawing
 * set, and the measurements on it are real. The dimension rule along the top
 * reports the actual viewport width in pixels and updates as the window is
 * resized; the title block on the right is the sheet's own spec, filled in
 * from live state rather than dressed up as data.
 *
 * That is the point of the whole thing — a site about building sites,
 * measuring itself in front of you.
 */

function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return width;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5 last:border-b-0">
      <dt className="spec text-bone-faint">{label}</dt>
      <dd className="font-mono text-xs text-bone">{value}</dd>
    </div>
  );
}

export function Hero() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const width = useViewportWidth();

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
      <div className="relative mx-auto max-w-[1400px]">
        {/* Top dimension rule. The number is the live viewport width. */}
        <div className="mb-3 flex items-center gap-3 animate-fade">
          <span className="dimline origin-left flex-1 animate-draw-x" />
          <span className="spec shrink-0 text-cyan tabular-nums">{width} px</span>
          <span className="dimline origin-right flex-1 animate-draw-x" />
        </div>

        <div className="cropmarks relative border border-rule">
          {/* Reference photo sits inside the frame at low opacity on large
              screens; the layout is designed to work without it. */}
          <div className="pointer-events-none absolute inset-0 hidden opacity-[0.13] lg:block">
            <ManagedImage
              slotId="hero-workspace"
              className="h-full w-full"
              aspect="16:9"
              priority
              label=""
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
          </div>

          <div className="relative grid gap-12 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[1.55fr_1fr] lg:gap-16 lg:px-14 lg:py-24">
            <div>
              <p
                className="spec animate-rise text-cyan"
                style={{ animationDelay: '80ms' }}
              >
                {t('hero.eyebrow')}
              </p>

              <h1
                className="mt-7 animate-rise font-display text-display text-bone"
                style={{ animationDelay: '160ms' }}
              >
                {t('hero.titleLine1')}{' '}
                <em className="not-italic text-cyan">{t('hero.titleEmphasis')}</em>{' '}
                {t('hero.titleLine2')}
              </h1>

              <p
                className="mt-8 max-w-xl animate-rise text-lg text-bone-mute"
                style={{ animationDelay: '260ms' }}
              >
                {t('hero.sub')}
              </p>

              <div
                className="mt-10 flex animate-rise flex-col gap-3 sm:flex-row"
                style={{ animationDelay: '360ms' }}
              >
                <ButtonLink to="/request" size="lg">
                  {t('hero.ctaPrimary')}
                  <Arrow />
                </ButtonLink>
                <ButtonLink to="/marketplace" variant="secondary" size="lg">
                  {t('hero.ctaSecondary')}
                </ButtonLink>
              </div>
            </div>

            {/* Title block — the same panel a drawing carries in its corner. */}
            <aside
              className="animate-rise self-end border border-rule-soft bg-ink-deep/80 p-5 backdrop-blur-sm sm:p-6"
              style={{ animationDelay: '440ms' }}
              aria-label={t('hero.spec.title')}
            >
              <div className="mb-4 flex items-baseline justify-between border-b border-rule pb-3">
                <span className="spec text-bone">{t('hero.spec.title')}</span>
                <span className="spec text-cyan">{t('hero.spec.sheetNo')} 01</span>
              </div>

              <dl>
                <SpecRow label={t('hero.spec.drawnBy')} value={site.ownerName} />
                <SpecRow label={t('hero.spec.scale')} value={t('hero.spec.scaleValue')} />
                <SpecRow label={t('hero.spec.locale')} value={LOCALE_LABELS[locale].short} />
                <SpecRow label={t('hero.spec.viewport')} value={`${width}px`} />
                <SpecRow
                  label={t('hero.spec.revision')}
                  value={String(new Date().getFullYear())}
                />
              </dl>

              <div className="mt-4 flex items-center gap-2 border-t border-rule pt-4">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage" aria-hidden="true" />
                <span className="spec text-sage">{t('hero.spec.statusValue')}</span>
              </div>

              <p className="mt-4 border-t border-rule-soft pt-4 text-xs leading-relaxed text-bone-faint">
                {t('hero.spec.notesValue')}
              </p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
