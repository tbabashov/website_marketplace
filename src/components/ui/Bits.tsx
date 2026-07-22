import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { useUI } from '@/store/ui';
import type { OrderStatus } from '@/types/db';

/* -------------------------------------------------------------------------
   Section scaffolding
   ------------------------------------------------------------------------- */

/**
 * The section marker: a mono label with a rule running off to the right, the
 * way a drawing labels a region. Deliberately not a centred eyebrow.
 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-4', className)}>
      <span className="spec whitespace-nowrap text-cyan">{children}</span>
      <span className="h-px flex-1 bg-rule-soft" />
    </div>
  );
}

/** Horizontal dimension line with a measurement sitting on it. */
export function DimLine({ value, className }: { value: string; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <span className="dimline flex-1" />
      <span className="spec text-bone-faint">{value}</span>
      <span className="dimline flex-1" />
    </div>
  );
}

export function Panel({
  children,
  className,
  marks = false,
}: {
  children: ReactNode;
  className?: string;
  marks?: boolean;
}) {
  return (
    <div className={clsx('border border-rule-soft bg-surface', marks && 'cropmarks', className)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Scroll reveal — one orchestrated moment, driven by CSS in index.css
   ------------------------------------------------------------------------- */

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'article';
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Anyone who asked for less motion gets the finished state immediately;
    // no observer, no transition, no work.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.setAttribute('data-shown', '');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-shown', '');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal=""
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------
   Status
   ------------------------------------------------------------------------- */

/**
 * Brass = waiting on someone. Cyan = in motion. Sage = settled.
 * Rust = something went wrong. Colour is never the only signal — the label
 * always spells the state out.
 */
const statusTone: Record<OrderStatus, string> = {
  draft: 'border-rule text-bone-faint',
  quote_requested: 'border-brass/50 text-brass',
  quoted: 'border-brass/50 text-brass',
  quote_declined: 'border-rule text-bone-faint',
  awaiting_payment: 'border-brass/50 text-brass',
  payment_submitted: 'border-brass/50 text-brass',
  paid: 'border-sage/50 text-sage',
  in_progress: 'border-cyan/50 text-cyan',
  delivered: 'border-cyan/50 text-cyan',
  completed: 'border-sage/50 text-sage',
  payment_rejected: 'border-rust/50 text-rust',
  cancelled: 'border-rule text-bone-faint',
};

export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={clsx(
        'spec inline-flex items-center rounded-[2px] border px-2 py-1',
        statusTone[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={clsx('inline-flex items-center gap-0.5', className)} title={undefined}>
      <span className="sr-only">{t('a11y.rating', { rating })}</span>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
          <path
            d="M10 1.6l2.5 5.3 5.6.8-4 4 .9 5.7L10 14.7 5 17.4l1-5.7-4.1-4 5.6-.8z"
            className={i <= rating ? 'fill-brass' : 'fill-rule'}
          />
        </svg>
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Feedback
   ------------------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-rule-soft px-6 py-14 text-center">
      <p className="font-display text-h4 text-bone">{title}</p>
      {body && <p className="mx-auto mt-3 max-w-prose text-sm text-bone-mute">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block h-4 w-4 animate-spin rounded-full border border-rule border-t-cyan',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-bone-faint">
      <Spinner />
      <span className="spec">{t('common.loading')}</span>
    </div>
  );
}

/** Live region for the small confirmations after an action. */
export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto flex max-w-md items-start gap-3 border bg-surface px-4 py-3 text-sm shadow-lg',
            toast.tone === 'bad' ? 'border-rust/50 text-bone' : 'border-cyan/40 text-bone',
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="spec shrink-0 text-bone-faint hover:text-bone"
          >
            {t('common.close')}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Shown wherever demo content stands in for a real database. */
export function DemoNotice({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={clsx('spec text-brass/80', className)}>{t('common.demoNotice')}</p>
  );
}

/* -------------------------------------------------------------------------
   Copy-to-clipboard, used for the payment reference and account details
   ------------------------------------------------------------------------- */

export function CopyValue({
  value,
  display,
  className,
}: {
  value: string;
  display?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard blocked (insecure context, or the user said no). The value
      // is on screen and selectable, so this is not worth an error message.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={clsx('flex items-center justify-between gap-4', className)}>
      <span className="font-mono text-base text-bone select-all">{display ?? value}</span>
      <button
        type="button"
        onClick={copy}
        className="spec shrink-0 text-cyan hover:text-cyan-bright"
      >
        {copied ? t('common.copied') : t('common.copy')}
      </button>
    </div>
  );
}
