import type { CSSProperties } from 'react';
import clsx from 'clsx';

/**
 * The hero's right-hand visual: a mock browser in which a website builds itself
 * on a slow loop — rough grey skeleton, then a finished, styled page, then back
 * again. It says what the studio does without a word of copy.
 *
 * Pure CSS, no assets. Every region holds two layers: `.bp-final` (the styled
 * result, in flow) and `.bp-skel` (a grey placeholder covering it). They share
 * one timeline (see index.css) and a per-region `--bp-delay`, so the page
 * resolves top-to-bottom rather than all at once. Colours, radii and fonts all
 * come from the theme tokens the rest of the site uses.
 *
 * Decorative, so the whole thing is aria-hidden; nothing here is information a
 * screen-reader needs. Under prefers-reduced-motion it settles on the finished
 * frame instead of looping.
 */

/** A region wrapper that positions its skeleton over its finished content. */
function Region({
  delay,
  className,
  children,
}: {
  delay: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx('relative', className)} style={{ '--bp-delay': delay } as CSSProperties}>
      {children}
    </div>
  );
}

export function BuildPreview({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={clsx('relative mx-auto w-full max-w-[30rem] select-none', className)}
      // The caller's fade-up delay (--d) rides alongside this component's own
      // loop duration (--bp-dur).
      style={{ '--bp-dur': '8s', ...style } as CSSProperties}
    >
      {/* Ambient cobalt glow, for depth. */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-blue/15 blur-3xl"
      />

      {/* Browser frame */}
      <div className="rounded-[1.4rem] bg-paper-2 p-2.5 shadow-[0_24px_60px_-24px_rgba(18,18,16,0.35)]">
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          </span>
          <Region delay="0s" className="ml-2 flex h-6 flex-1 items-center rounded-full bg-field px-3">
            <span className="bp-final num text-[0.62rem] text-ink-mute">websale.az</span>
            <span className="bp-skel m-1 rounded-full bg-ink/8" />
          </Region>
        </div>

        {/* The page */}
        <div className="rounded-[1rem] bg-field p-4 sm:p-5">
          {/* Nav */}
          <Region delay="0.1s" className="flex h-5 items-center">
            <div className="bp-final flex w-full items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-[5px] bg-blue" />
                <span className="h-2 w-12 rounded-full bg-ink/75" />
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-6 rounded-full bg-ink/20" />
                <span className="h-1.5 w-6 rounded-full bg-ink/20" />
                <span className="h-4 w-10 rounded-full bg-blue" />
              </span>
            </div>
            <div className="bp-skel flex items-center justify-between">
              <span className="h-3 w-16 rounded bg-ink/12" />
              <span className="flex gap-1.5">
                <span className="h-2.5 w-6 rounded bg-ink/10" />
                <span className="h-2.5 w-6 rounded bg-ink/10" />
                <span className="h-2.5 w-8 rounded bg-ink/10" />
              </span>
            </div>
          </Region>

          {/* Hero: text left, illustration right */}
          <div className="mt-5 grid grid-cols-[1.25fr_1fr] items-center gap-4">
            <div>
              {/* Heading */}
              <Region delay="0.2s">
                <div className="bp-final font-display text-[0.95rem] font-extrabold leading-[1.05] tracking-[-0.02em]">
                  <span className="block text-ink">İdeyadan</span>
                  <span className="block text-blue">hazır sayta.</span>
                </div>
                <div className="bp-skel flex flex-col justify-center gap-1.5">
                  <span className="h-2.5 w-full rounded bg-ink/14" />
                  <span className="h-2.5 w-3/4 rounded bg-ink/14" />
                </div>
              </Region>

              {/* Paragraph */}
              <Region delay="0.28s" className="mt-3">
                <div className="bp-final flex flex-col gap-1.5">
                  <span className="h-1.5 w-full rounded-full bg-ink/12" />
                  <span className="h-1.5 w-5/6 rounded-full bg-ink/12" />
                </div>
                <div className="bp-skel flex flex-col justify-center gap-1.5">
                  <span className="h-1.5 w-full rounded-full bg-ink/8" />
                  <span className="h-1.5 w-2/3 rounded-full bg-ink/8" />
                </div>
              </Region>

              {/* Button */}
              <Region delay="0.42s" className="mt-4 inline-flex">
                <span className="bp-final inline-flex items-center gap-1 rounded-full bg-blue px-3 py-1.5 text-[0.6rem] font-semibold text-paper">
                  Sifariş et
                  <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h9M8 4l4 4-4 4" />
                  </svg>
                </span>
                <span className="bp-skel rounded-full bg-ink/12" />
              </Region>
            </div>

            {/* Illustration block */}
            <Region delay="0.34s" className="aspect-[3/4]">
              <div className="bp-final absolute inset-0 overflow-hidden rounded-[0.7rem] bg-gradient-to-br from-blue to-blue-lift">
                {/* A simple abstract composition, not a stock image. */}
                <span className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-paper/20" />
                <span className="absolute bottom-4 left-3 h-6 w-6 rounded-full border-2 border-paper/40" />
                <span className="absolute bottom-3 right-3 h-1.5 w-10 rounded-full bg-paper/40" />
                <span className="absolute bottom-6 right-3 h-1.5 w-6 rounded-full bg-paper/25" />
              </div>
              <div className="bp-skel rounded-[0.7rem] bg-ink/10" />
            </Region>
          </div>
        </div>
      </div>
    </div>
  );
}
