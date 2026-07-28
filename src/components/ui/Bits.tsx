import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { useUI } from '@/store/ui';
import type { OrderStatus } from '@/types/db';

/* -------------------------------------------------------------------------
   Section scaffolding
   ------------------------------------------------------------------------- */

/** Wraps a section in the site's single content measure. */
export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto w-full max-w-[1440px] px-6 md:px-10', className)}>{children}</div>;
}

/**
 * Section marker: a small cobalt bullet and a tracked label. No rule, no
 * numbering — the label sits in space and lets the heading below it carry the
 * weight.
 */
export function Eyebrow({
  children,
  tone = 'ink',
  className,
}: {
  children: ReactNode;
  tone?: 'ink' | 'paper';
  className?: string;
}) {
  return (
    <p className={clsx('label flex items-center gap-2.5', tone === 'ink' ? 'text-ink-mute' : 'text-paper/60', className)}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue" aria-hidden="true" />
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------
   Scroll reveal
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
  as?: 'div' | 'li' | 'section' | 'article' | 'header';
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.setAttribute('data-shown', '');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-shown', '');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );

    io.observe(node);
    return () => io.disconnect();
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
   Marquee
   ------------------------------------------------------------------------- */

/**
 * Infinite horizontal ticker. Children are rendered twice and the track
 * translates -50%, so the loop lands exactly on the duplicate and has no seam.
 */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const run = (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="flex items-center">
          <span className="px-8 text-d3 font-display font-semibold whitespace-nowrap">{item}</span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-blue" aria-hidden="true" />
        </span>
      ))}
    </div>
  );

  return (
    <div className={clsx('marquee overflow-hidden', className)} aria-hidden="true">
      <div className="marquee-track">
        {run}
        {run}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Status
   ------------------------------------------------------------------------- */

/**
 * Amber = waiting on someone. Blue = moving. Green = settled. Red = wrong.
 * Colour is never the only signal; the label always spells the state out.
 */
const statusTone: Record<OrderStatus, string> = {
  draft: 'bg-paper-3 text-ink-mute',
  quote_requested: 'bg-amber/12 text-amber',
  quoted: 'bg-amber/12 text-amber',
  quote_declined: 'bg-paper-3 text-ink-mute',
  awaiting_payment: 'bg-amber/12 text-amber',
  payment_submitted: 'bg-amber/12 text-amber',
  paid: 'bg-green/12 text-green',
  in_progress: 'bg-blue/10 text-blue',
  delivered: 'bg-blue/10 text-blue',
  completed: 'bg-green/12 text-green',
  payment_rejected: 'bg-red/10 text-red',
  cancelled: 'bg-paper-3 text-ink-mute',
};

export function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={clsx(
        'label inline-flex items-center rounded-full px-3 py-1.5',
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
    <span className={clsx('inline-flex items-center gap-1', className)}>
      <span className="sr-only">{t('a11y.rating', { rating })}</span>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
          <path
            d="M10 1.6l2.5 5.3 5.6.8-4 4 .9 5.7L10 14.7 5 17.4l1-5.7-4.1-4 5.6-.8z"
            className={i <= rating ? 'fill-blue' : 'fill-current opacity-20'}
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
  title: ReactNode;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-paper-2 px-8 py-20 text-center">
      <p className="font-display text-d3">{title}</p>
      {body && <p className="mx-auto mt-4 max-w-prose text-ink-soft">{body}</p>}
      {action && <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-3 py-32 text-ink-mute">
      <Spinner />
      <span className="label">{t('common.loading')}</span>
    </div>
  );
}

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[250] flex flex-col items-center gap-2 p-5"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'fade-up pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl py-3 pl-5 pr-3 text-sm shadow-xl',
            toast.tone === 'bad' ? 'bg-red text-paper' : 'bg-ink text-paper',
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t('common.close')}
            data-cursor="link"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-paper/60 transition-colors hover:bg-paper/15 hover:text-paper"
          >
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function DemoNotice({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={clsx('label inline-flex rounded-full bg-amber/12 px-3 py-1.5 text-amber', className)}>
      {t('common.demoNotice')}
    </p>
  );
}

/* -------------------------------------------------------------------------
   Copy-to-clipboard
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
      // Clipboard blocked. The value is on screen and selectable, so this
      // does not warrant an error message.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={clsx('flex items-center justify-between gap-4', className)}>
      <span className="num select-all text-lg font-medium">{display ?? value}</span>
      <button
        type="button"
        onClick={copy}
        data-cursor="link"
        className="label shrink-0 rounded-full bg-ink/8 px-3 py-1.5 text-ink transition-colors hover:bg-blue hover:text-paper"
      >
        {copied ? t('common.copied') : t('common.copy')}
      </button>
    </div>
  );
}
