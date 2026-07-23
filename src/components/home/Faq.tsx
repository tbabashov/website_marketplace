import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { Eyebrow, Shell } from '@/components/ui/Bits';

interface FaqItem {
  q: string;
  a: string;
}

/**
 * A native <details> accordion. Keyboard handling, open/closed state and
 * find-in-page all come from the browser, which gets more of it right than a
 * hand-rolled version would.
 */
function Row({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="group border-b border-line"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        data-cursor="link"
        className="flex cursor-pointer list-none items-start gap-6 py-7 [&::-webkit-details-marker]:hidden"
      >
        <span className="flex-1 text-d4 font-display transition-colors duration-300 group-hover:text-blue">
          {item.q}
        </span>

        <span
          aria-hidden="true"
          className={clsx(
            'relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
            open ? 'bg-blue text-paper' : 'bg-paper-2 text-ink group-hover:bg-paper-3',
          )}
        >
          <span className="absolute h-[1.5px] w-3.5 bg-current" />
          <span
            className={clsx(
              'absolute h-3.5 w-[1.5px] bg-current transition-transform duration-300',
              open ? 'scale-y-0' : 'scale-y-100',
            )}
          />
        </span>
      </summary>

      <div className="pb-8 pr-14">
        <p className="max-w-2xl text-lg text-ink-soft">{item.a}</p>
      </div>
    </details>
  );
}

export function Faq() {
  const { t } = useTranslation();
  const items = t('faq.items', { returnObjects: true }) as FaqItem[];

  return (
    <section id="faq" className="scroll-mt-24 py-24 md:py-32" aria-labelledby="faq-heading">
      <Shell>
        <div className="grid gap-14 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Eyebrow>{t('faq.label')}</Eyebrow>
            <h2 id="faq-heading" className="mt-7 text-d1 font-display">
              {t('faq.title')}
            </h2>
          </div>

          <div className="border-t border-line">
            {items.map((item) => (
              <Row key={item.q} item={item} />
            ))}
          </div>
        </div>
      </Shell>
    </section>
  );
}
