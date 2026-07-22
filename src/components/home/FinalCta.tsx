import { useTranslation } from 'react-i18next';

import { Arrow, ButtonLink } from '@/components/ui/Button';

/**
 * The one light section on the site: the drawing finally printed on paper.
 * It is the only place bone is used as a background, which is what makes it
 * function as an ending rather than as another band of content.
 */
export function FinalCta() {
  const { t } = useTranslation();

  return (
    <section className="bg-bone px-5 py-24 text-ink sm:px-8" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-center gap-4">
          <span className="h-px w-12 bg-ink/25" aria-hidden="true" />
          <h2 id="cta-heading" className="font-display text-h1 text-ink">
            {t('finalCta.title')}
          </h2>
        </div>
        <p className="mt-4 max-w-xl text-lg text-ink/70">{t('finalCta.lead')}</p>

        <div className="mt-14 grid gap-px overflow-hidden bg-ink/15 md:grid-cols-2">
          <div className="flex flex-col bg-bone p-8 sm:p-10">
            <span className="spec text-ink/45">01</span>
            <h3 className="mt-5 font-display text-h2 text-ink">{t('finalCta.readyTitle')}</h3>
            <p className="mt-4 flex-1 text-ink/70">{t('finalCta.readyBody')}</p>
            <ButtonLink to="/marketplace" variant="inverseGhost" size="lg" className="mt-8 self-start">
              {t('finalCta.readyAction')}
              <Arrow />
            </ButtonLink>
          </div>

          <div className="flex flex-col bg-bone p-8 sm:p-10">
            <span className="spec text-ink/45">02</span>
            <h3 className="mt-5 font-display text-h2 text-ink">{t('finalCta.customTitle')}</h3>
            <p className="mt-4 flex-1 text-ink/70">{t('finalCta.customBody')}</p>
            <ButtonLink to="/request" variant="inverse" size="lg" className="mt-8 self-start">
              {t('finalCta.customAction')}
              <Arrow />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
