import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { SectionLabel } from '@/components/ui/Bits';

interface FaqItem {
  q: string;
  a: string;
}

/**
 * A native <details> accordion. Keyboard behaviour, the open/closed state and
 * find-in-page all come from the browser, which is more than a hand-rolled
 * version would get right.
 */
function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="group border-b border-rule-soft"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-start gap-5 py-6 [&::-webkit-details-marker]:hidden">
        <span className="spec mt-1.5 shrink-0 tabular-nums text-cyan">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="flex-1 font-display text-h4 text-bone transition-colors group-hover:text-cyan-bright">
          {item.q}
        </span>
        <span
          aria-hidden="true"
          className="relative mt-2 h-3 w-3 shrink-0 text-bone-faint transition-colors group-hover:text-cyan"
        >
          <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
          <span
            className={clsx(
              'absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current transition-transform duration-200',
              open ? 'scale-y-0' : 'scale-y-100',
            )}
          />
        </span>
      </summary>

      <div className="pb-7 pl-11 pr-8">
        <p className="max-w-2xl text-bone-mute">{item.a}</p>
      </div>
    </details>
  );
}

export function Faq() {
  const { t } = useTranslation();
  const items = t('faq.items', { returnObjects: true }) as FaqItem[];

  // Split into two columns on wide screens so the section does not become one
  // very long strip under the sections above it.
  const mid = Math.ceil(items.length / 2);
  const columns = [items.slice(0, mid), items.slice(mid)];

  return (
    <section id="faq" className="border-t border-rule-soft px-5 py-24 sm:px-8" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel>{t('faq.label')}</SectionLabel>

        <h2 id="faq-heading" className="mt-8 max-w-2xl font-display text-h1 text-bone">
          {t('faq.title')}
        </h2>

        <div className="mt-12 grid gap-x-16 lg:grid-cols-2">
          {columns.map((column, col) => (
            <div key={col}>
              {column.map((item, i) => (
                <FaqRow key={item.q} item={item} index={col * mid + i} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
