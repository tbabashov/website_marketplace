import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import { useMagnetic } from '@/lib/useMagnetic';

type Variant = 'primary' | 'outline' | 'ghost' | 'onNight' | 'onBlue' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/**
 * Every action on the site is a pill. That single shape decision is what lets
 * the rest of the page carry no borders at all — a rounded, filled shape reads
 * as pressable without needing an outline to say so.
 */
const base =
  'group/btn relative inline-flex items-center justify-center gap-2.5 rounded-full font-semibold ' +
  'transition-[background-color,color,border-color] duration-300 ' +
  'disabled:pointer-events-none disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-blue text-paper hover:bg-blue-deep',
  outline: 'border border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink-mute hover:text-ink hover:bg-paper-2',
  onNight: 'bg-paper text-ink hover:bg-blue hover:text-paper',
  onBlue: 'bg-paper text-blue hover:bg-ink hover:text-paper',
  danger: 'border border-red/40 text-red hover:bg-red hover:text-paper',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Adds the pointer-following pull. Reserve it for primary actions. */
  magnetic?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  magnetic = false,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useMagnetic<HTMLButtonElement>(magnetic ? 0.22 : 0);

  return (
    <button
      ref={magnetic ? ref : undefined}
      data-cursor="link"
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
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
  magnetic = false,
}: Common & { to: string; external?: boolean }) {
  const ref = useMagnetic<HTMLAnchorElement>(magnetic ? 0.22 : 0);
  const cls = clsx(base, variants[variant], sizes[size], className);

  if (external) {
    return (
      <a
        ref={magnetic ? ref : undefined}
        href={to}
        target="_blank"
        rel="noreferrer noopener"
        data-cursor="link"
        className={cls}
      >
        {children}
      </a>
    );
  }

  return (
    <Link ref={magnetic ? ref : undefined} to={to} data-cursor="link" className={cls}>
      {children}
    </Link>
  );
}

/** Forward arrow. Nudges right inside any hovered `.group/btn`. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx(
        'shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1',
        className,
      )}
    >
      <path d="M3 10h13M11 5l5 5-5 5" />
    </svg>
  );
}
