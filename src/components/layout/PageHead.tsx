import type { ReactNode } from 'react';
import clsx from 'clsx';

import { Eyebrow, Shell } from '@/components/ui/Bits';

/**
 * The opening of every non-home page. Deep top padding clears the floating
 * header and gives interior pages the same generous entrance the landing page
 * has — no rules, no boxes, just the title in space.
 */
export function PageHead({
  label,
  title,
  lead,
  aside,
  className,
}: {
  label?: string;
  title: string;
  lead?: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx('pt-36 md:pt-44', className)}>
      <Shell>
        {label && <Eyebrow className="mb-7">{label}</Eyebrow>}

        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="fade-up max-w-4xl text-d1 font-display">{title}</h1>
            {lead && (
              <p
                className="fade-up mt-7 max-w-2xl text-xl text-ink-soft"
                style={{ '--d': '120ms' } as React.CSSProperties}
              >
                {lead}
              </p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </Shell>
    </header>
  );
}
