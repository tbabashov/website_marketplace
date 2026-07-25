import { useTranslation } from 'react-i18next';

import { Arrow, ButtonLink } from '@/components/ui/Button';
import { Shell } from '@/components/ui/Bits';

/**
 * The closing band, and the only place the cobalt is used as a ground rather
 * than an accent. After a page of paper with blue punctuation, filling the
 * whole width with it is the loudest gesture available — which is why it is
 * saved for the last thing on the page and never repeated.
 */
export function FinalCta() {
  const { t } = useTranslation();

  return (
    <section className="px-3 pb-8 md:px-5" aria-labelledby="cta-heading">
      <div data-cursor-on-dark
      className="rounded-[2rem] bg-blue py-24 text-paper md:rounded-[2.75rem] md:py-32">
        <Shell>
          <h2 id="cta-heading" className="max-w-4xl text-d1 font-display text-paper">
            {t('finalCta.title')}
          </h2>
          <p className="mt-6 max-w-xl text-xl text-paper/75">{t('finalCta.lead')}</p>

          <div className="mt-16 grid gap-10 md:grid-cols-2 md:gap-16">
            <div className="border-t border-paper/25 pt-8">
              <h3 className="text-d3 font-display text-paper">{t('finalCta.readyTitle')}</h3>
              <p className="mt-4 max-w-sm text-paper/70">{t('finalCta.readyBody')}</p>
              <ButtonLink to="/marketplace" variant="onBlue" size="lg" className="mt-8">
                {t('finalCta.readyAction')}
                <Arrow />
              </ButtonLink>
            </div>

            <div className="border-t border-paper/25 pt-8">
              <h3 className="text-d3 font-display text-paper">{t('finalCta.customTitle')}</h3>
              <p className="mt-4 max-w-sm text-paper/70">{t('finalCta.customBody')}</p>
              <ButtonLink to="/request" variant="onBlue" size="lg" className="mt-8" magnetic>
                {t('finalCta.customAction')}
                <Arrow />
              </ButtonLink>
            </div>
          </div>
        </Shell>
      </div>
    </section>
  );
}
