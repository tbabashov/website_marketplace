import { useTranslation } from 'react-i18next';

import { ManagedImage } from '@/components/media/ManagedImage';
import { Eyebrow, Reveal, Shell } from '@/components/ui/Bits';

interface Step {
  title: string;
  body: string;
}

/**
 * The one place on this page where numbering is honest: request → quote →
 * build → handover is a real sequence, and the order is the information.
 *
 * Built as a sticky two-column: the heading and portrait hold their position
 * on the left while the steps scroll past on the right. It is the only sticky
 * moment on the landing page, which is what keeps it feeling like an event.
 */
export function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('how.steps', { returnObjects: true }) as Step[];

  return (
    <section id="how" className="scroll-mt-24 py-24 md:py-32" aria-labelledby="how-heading">
      <Shell>
        <div className="grid gap-16 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>{t('how.label')}</Eyebrow>
            <h2 id="how-heading" className="mt-7 text-d1 font-display">
              {t('how.title')}
            </h2>
            <p className="mt-6 max-w-md text-xl text-ink-soft">{t('how.lead')}</p>

            <ManagedImage
              slotId="owner-portrait"
              aspect="4:5"
              label="owner-portrait"
              className="mt-12 max-w-[17rem]"
            />
          </div>

          <ol className="flex flex-col">
            {steps.map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                delay={i * 60}
                className="border-t border-line py-10 first:border-t-0 first:pt-0 md:py-14"
              >
                <div className="flex items-start gap-6 md:gap-10">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 shrink-0 font-display text-d4 font-extrabold text-blue tabular-nums"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-d3 font-display">{step.title}</h3>
                    <p className="mt-4 max-w-xl text-lg text-ink-soft">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Shell>
    </section>
  );
}
