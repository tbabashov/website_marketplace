import { useTranslation } from 'react-i18next';

import { Arrow, ButtonLink } from '@/components/ui/Button';
import { Marquee, Shell } from '@/components/ui/Bits';
import { site } from '@/config/site';

/**
 * The opening statement. Three headline lines rise out of masks in sequence,
 * with the middle line carrying the cobalt.
 *
 * The ticker below is the only element that touches both edges of the screen,
 * which is what makes the page feel wider than its measure.
 */
export function Hero() {
  const { t } = useTranslation();

  const items = t('marquee.items', { returnObjects: true }) as string[];
  // The phone number comes from config rather than the locale files, so it
  // never has to be kept in sync in three places.
  const marqueeItems = site.phone ? [...items, site.phone] : items;

  return (
    <section className="relative pt-36 md:pt-44">
      <Shell>
        <p className="label fade-up text-ink-mute" style={{ '--d': '80ms' } as React.CSSProperties}>
          {t('hero.eyebrow')}
        </p>

        <h1 className="mt-8 max-w-[18ch] text-mega font-display font-extrabold">
          <span className="line-mask">
            <span style={{ '--d': '160ms' } as React.CSSProperties}>{t('hero.titleLine1')}</span>
          </span>
          <span className="line-mask">
            <span className="text-blue" style={{ '--d': '280ms' } as React.CSSProperties}>
              {t('hero.titleEmphasis')}
            </span>
          </span>
          <span className="line-mask">
            <span style={{ '--d': '400ms' } as React.CSSProperties}>{t('hero.titleLine2')}</span>
          </span>
        </h1>

        <div className="mt-14 grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <p
            className="fade-up max-w-xl text-xl text-ink-soft"
            style={{ '--d': '560ms' } as React.CSSProperties}
          >
            {t('hero.sub')}
          </p>

          <div
            className="fade-up flex flex-col gap-3 sm:flex-row md:justify-end"
            style={{ '--d': '660ms' } as React.CSSProperties}
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
      </Shell>

      <div
        className="fade-up mt-20 border-y border-line py-6 md:mt-28"
        style={{ '--d': '800ms' } as React.CSSProperties}
      >
        <Marquee items={marqueeItems} />
      </div>
    </section>
  );
}
