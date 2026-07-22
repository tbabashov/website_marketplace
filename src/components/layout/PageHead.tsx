import type { ReactNode } from 'react';
import clsx from 'clsx';

/**
 * The top of every non-home page. A mono label on a rule, the title, and an
 * optional lead — the same measured opening as a section marker, so the
 * interior pages sit inside the same drawing as the landing page.
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
    <header className={clsx('border-b border-rule-soft px-5 py-16 sm:px-8 sm:py-20', className)}>
      <div className="mx-auto max-w-[1400px]">
        {label && (
          <div className="mb-7 flex items-center gap-4">
            <span className="spec whitespace-nowrap text-cyan">{label}</span>
            <span className="h-px flex-1 bg-rule-soft" />
          </div>
        )}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-3xl font-display text-h1 text-bone">{title}</h1>
            {lead && <p className="mt-5 max-w-2xl text-lg text-bone-mute">{lead}</p>}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </div>
    </header>
  );
}
