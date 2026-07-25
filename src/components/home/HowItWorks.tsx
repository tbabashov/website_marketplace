import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { Eyebrow, Reveal, Shell } from '@/components/ui/Bits';

interface Step {
  title: string;
  body: string;
}

/**
 * The one place on this page where numbering is honest: request → quote →
 * build → handover is a real sequence, and the order is the information.
 *
 * Built as a sticky two-column: the heading and a step rail hold their position
 * on the left while the steps scroll past on the right. The rail lays all four
 * out at once — the visual argument for "no surprises" — and fills in cobalt to
 * mark whichever step is currently in view, so the left side quietly tracks the
 * right. It is the only sticky moment on the landing page, which is what keeps
 * it feeling like an event.
 */
export function HowItWorks() {
  const { t } = useTranslation();
  const steps = t('how.steps', { returnObjects: true }) as Step[];
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // The active step is the one crossing the middle of the viewport. The tall
  // negative top/bottom margins collapse the root to a thin band at the centre,
  // so exactly one step is "intersecting" at a time as the list scrolls past.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = stepRefs.current.indexOf(e.target as HTMLDivElement);
            if (i !== -1) setActive(i);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  function jump(i: number) {
    stepRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <section id="how" className="scroll-mt-24 py-24 md:py-32" aria-labelledby="how-heading">
      <Shell>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,27rem)_1fr] lg:gap-20">
          <div className="min-w-0 lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>{t('how.label')}</Eyebrow>
            <h2
              id="how-heading"
              className="mt-7 text-[clamp(1.75rem,3.4vw,2.75rem)] font-display leading-[1.05] tracking-[-0.03em]"
            >
              {t('how.title')}
            </h2>
            <p className="mt-6 max-w-md text-xl text-ink-soft">{t('how.lead')}</p>

            <StepRail steps={steps} active={active} onJump={jump} />
          </div>

          <ol className="flex flex-col">
            {steps.map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                delay={i * 60}
                className="border-t border-line py-10 first:border-t-0 first:pt-0 md:py-14"
              >
                <div
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  id={`how-step-${i}`}
                  className="flex items-start gap-6 md:gap-10"
                >
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

/**
 * A vertical four-node tracker. A hairline track runs the full height; a cobalt
 * fill grows down to the active node. Each node is a jump link to its step, so
 * the rail doubles as a compact index. Purely supportive — the real steps are
 * the ordered list beside it — so it is hidden from assistive tech.
 */
function StepRail({
  steps,
  active,
  onJump,
}: {
  steps: Step[];
  active: number;
  onJump: (i: number) => void;
}) {
  const last = steps.length - 1;
  const fill = last > 0 ? (active / last) * 100 : 0;

  return (
    <div aria-hidden="true" className="mt-12 hidden sm:block">
      <div className="relative pl-1">
        {/* Track + growing cobalt fill, centred on the node column (left 9px). */}
        <span className="absolute bottom-2 left-[9px] top-2 w-px bg-line" />
        <span
          className="absolute left-[9px] top-2 w-px bg-blue transition-[height] duration-500 ease-out"
          style={{ height: `calc((100% - 1rem) * ${fill / 100})` }}
        />

        <ul className="flex flex-col gap-7">
          {steps.map((step, i) => {
            const done = i < active;
            const now = i === active;
            return (
              <li key={step.title} className="relative">
                <button
                  type="button"
                  data-cursor="link"
                  onClick={() => onJump(i)}
                  className="group flex items-center gap-4 text-left"
                >
                  <span
                    className={clsx(
                      'relative z-[1] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 bg-paper transition-colors duration-300',
                      now
                        ? 'border-blue'
                        : done
                          ? 'border-blue/60'
                          : 'border-line group-hover:border-ink/30',
                    )}
                  >
                    <span
                      className={clsx(
                        'rounded-full transition-all duration-300',
                        now
                          ? 'h-2 w-2 bg-blue'
                          : done
                            ? 'h-2 w-2 bg-blue/60'
                            : 'h-0 w-0 bg-transparent',
                      )}
                    />
                  </span>
                  <span
                    className={clsx(
                      'label tabular-nums transition-colors duration-300',
                      now ? 'text-ink' : 'text-ink-mute group-hover:text-ink-soft',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={clsx(
                      'truncate text-sm transition-colors duration-300',
                      now ? 'font-medium text-ink' : 'text-ink-mute group-hover:text-ink-soft',
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
