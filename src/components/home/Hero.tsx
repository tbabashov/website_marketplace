import { useTranslation } from 'react-i18next';

import { Arrow, ButtonLink } from '@/components/ui/Button';
import { ManagedImage } from '@/components/media/ManagedImage';
import { Marquee, Shell } from '@/components/ui/Bits';

/**
 * The opening statement, and the site's signature composition.
 *
 * Three headline lines rise out of masks in sequence — and the second line
 * carries an image plate set *inline with the type*, sitting on the baseline
 * between two words. That single decision is what makes the hero read as
 * something composed rather than assembled: the picture is not beside the
 * headline, it is inside the sentence.
 *
 * The plate is hidden below `sm`, where inline media at that scale would break
 * the line rhythm rather than enrich it.
 */
export function Hero() {
  const { t } = useTranslation();
  const marqueeItems = t('marquee.items', { returnObjects: true }) as string[];

  return (
    <section className="relative pt-36 md:pt-44">
      <Shell>
        <p className="label fade-up text-ink-mute" style={{ '--d': '80ms' } as React.CSSProperties}>
          {t('hero.eyebrow')}
        </p>

        <h1 className="mt-8 text-mega font-display font-extrabold">
          <span className="line-mask">
            <span style={{ '--d': '160ms' } as React.CSSProperties}>{t('hero.titleLine1')}</span>
          </span>

          <span className="line-mask">
            <span
              className="flex flex-wrap items-center gap-x-[0.28em]"
              style={{ '--d': '280ms' } as React.CSSProperties}
            >
              <em className="not-italic text-blue">{t('hero.titleEmphasis')}</em>
              {/* Inline plate — sized in em so it scales with the headline. */}
              <ManagedImage
                slotId="hero-workspace"
                aspect="16:10"
                priority
                label=""
                className="hidden h-[0.72em] w-[1.15em] shrink-0 rounded-[0.14em] sm:block"
              />
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

      {/* Ticker. Full-bleed on purpose — the only element that touches both
          edges, which is what makes the page feel wider than it is. */}
      <div
        className="fade-up mt-20 border-y border-line py-6 md:mt-28"
        style={{ '--d': '800ms' } as React.CSSProperties}
      >
        <Marquee items={marqueeItems} />
      </div>
    </section>
  );
}
