import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Arrow, ButtonLink } from '@/components/ui/Button';
import { BuildPreview } from '@/components/home/BuildPreview';
import { Marquee, Shell } from '@/components/ui/Bits';
import { site } from '@/config/site';

/**
 * The opening statement. Text on the left — three headline lines rising out of
 * masks in sequence, with the middle line in cobalt — and, on the right, a mock
 * browser that builds a website on a loop (see BuildPreview). The headline is
 * held a notch below the full display size so it balances the visual across two
 * columns rather than crowding it.
 *
 * The ticker below is the only element that touches both edges of the screen,
 * which is what makes the page feel wider than its measure.
 */
export function Hero() {
  const { t } = useTranslation();

  const items = t('marquee.items', { returnObjects: true }) as string[];
  // The phone comes from config rather than the locale files, so it never has
  // to be kept in sync in three places.
  const marqueeItems = site.phone ? [...items, site.phone] : items;

  return (
    <section className="relative pt-32 md:pt-40">
      <Shell>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Text */}
          <div>
            <p
              className="label fade-up text-ink-mute"
              style={{ '--d': '80ms' } as CSSProperties}
            >
              {t('hero.eyebrow')}
            </p>

            <h1 className="mt-7 text-[clamp(2.25rem,4vw,3.5rem)] font-display font-extrabold leading-[1] tracking-[-0.04em]">
              <span className="line-mask">
                <span style={{ '--d': '160ms' } as CSSProperties}>{t('hero.titleLine1')}</span>
              </span>
              <span className="line-mask">
                <span className="text-blue" style={{ '--d': '280ms' } as CSSProperties}>
                  {t('hero.titleEmphasis')}
                </span>
              </span>
              <span className="line-mask">
                <span style={{ '--d': '400ms' } as CSSProperties}>{t('hero.titleLine2')}</span>
              </span>
            </h1>

            <p
              className="fade-up mt-8 max-w-xl text-lg text-ink-soft"
              style={{ '--d': '560ms' } as CSSProperties}
            >
              {t('hero.sub')}
            </p>

            <div
              className="fade-up mt-10 flex flex-col gap-3 sm:flex-row"
              style={{ '--d': '660ms' } as CSSProperties}
            >
              <ButtonLink to="/request" size="lg" magnetic>
                {t('hero.ctaPrimary')}
                <Arrow />
              </ButtonLink>
              <ButtonLink to="/marketplace" variant="outline" size="lg">
                {t('hero.ctaSecondary')}
              </ButtonLink>
            </div>
          </div>

          {/* Visual — stacks below the text on mobile. */}
          <BuildPreview
            className="fade-up mt-4 lg:mt-0"
            style={{ '--d': '820ms' } as CSSProperties}
          />
        </div>
      </Shell>

      <div
        className="fade-up mt-20 border-y border-line py-6 md:mt-28"
        style={{ '--d': '920ms' } as CSSProperties}
      >
        <Marquee items={marqueeItems} />
      </div>
    </section>
  );
}
