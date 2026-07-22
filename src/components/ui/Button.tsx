import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse' | 'inverseGhost';
type Size = 'sm' | 'md' | 'lg';

/**
 * Interactive elements carry a 2px radius; structural plates and rules stay
 * square. That single difference is what stops the drafting language from
 * flattening into an undifferentiated hairline grid.
 */
const base =
  'inline-flex items-center justify-center gap-2 rounded-[2px] font-medium transition-colors duration-150 ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-cyan text-ink hover:bg-cyan-bright active:bg-cyan',
  secondary: 'border border-rule text-bone hover:border-cyan hover:text-cyan-bright',
  ghost: 'text-bone-mute hover:text-bone hover:bg-surface-2',
  danger: 'border border-rust/60 text-rust hover:bg-rust hover:text-ink',
  // For the one bone-coloured section, where every other variant would sit at
  // the wrong end of the contrast range.
  inverse: 'bg-ink text-bone hover:bg-ink-deep',
  inverseGhost: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-bone',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  external = false,
}: CommonProps & { to: string; external?: boolean }) {
  const cls = clsx(base, variants[variant], sizes[size], className);

  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer noopener" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

/** The small chevron used on forward actions. Decorative — never announced. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      className={clsx('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="square" />
    </svg>
  );
}
