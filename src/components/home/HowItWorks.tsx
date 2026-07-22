import { useTranslation } from 'react-i18next';

import { ManagedImage } from '@/components/media/ManagedImage';
import { Reveal, SectionLabel } from '@/components/ui/Bits';

interface Step {
  title: string;
  body: string;
}

/**
 * The one place on this page where numbered markers are honest: request →
 * quote → build → handover really is a sequence, and the numbers are the point
 * rather than decoration.
 *
 * Laid out as a vertical rail against a portrait, not as four cards in a row —
 * the section above is already a grid, and repeating it here is how a page
 * starts to read as a template.
 */
export function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('how.steps', { returnObjects: true }) as Step[];

  return (
    <section id="how" className="border-t border-rule-soft px-5 py-24 sm:px-8" aria-labelledby="how-heading">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel>{t('how.label')}</SectionLabel>

        <div className="mt-8 grid gap-14 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="how-heading" className="font-display text-h1 text-bone">
              {t('how.title')}
            </h2>
            <p className="mt-4 max-w-md text-lg text-bone-mute">{t('how.lead')}</p>

            <div className="cropmarks mt-10 max-w-xs">
              <ManagedImage
                slotId="owner-portrait"
                aspect="4:5"
                label="owner-portrait"
                className="border border-rule-soft"
              />
            </div>
          </div>

          <ol className="relative">
            {/* The rail. Sits behind the markers and stops at the last one. */}
            <span
              className="absolute bottom-8 left-[15px] top-3 w-px bg-rule-soft"
              aria-hidden="true"
            />

            {steps.map((step, index) => (
              <Reveal as="li" key={step.title} delay={index * 70} className="relative pb-14 pl-14 last:pb-0">
                <span
                  className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center border border-rule bg-ink font-mono text-xs text-cyan tabular-nums"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <h3 className="font-display text-h3 text-bone">{step.title}</h3>
                <p className="mt-3 max-w-xl text-bone-mute">{step.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
