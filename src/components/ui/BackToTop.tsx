import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

/**
 * A floating return-to-top control in the bottom-right corner. It stays out of
 * the way until the visitor has scrolled a screenful or so, then fades and
 * lifts into view. Built from the same paper-disc-that-turns-cobalt language as
 * the gallery arrows, so it reads as part of the system rather than a bolt-on.
 *
 * Sits below the lightbox (z-300) and the cursor (z-9999) on purpose — it must
 * never cover an opened screenshot or the custom cursor.
 */
export function BackToTop() {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function toTop() {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      data-cursor="link"
      aria-label={t('nav.top')}
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={clsx(
        'fixed bottom-5 right-5 z-[100] flex h-12 w-12 items-center justify-center rounded-full',
        'bg-paper/85 text-ink shadow-[0_8px_28px_-8px_rgba(18,18,16,0.45)] ring-1 ring-ink/10 backdrop-blur-sm',
        'transition-[opacity,transform,background-color,color] duration-300 ease-out',
        'hover:bg-blue hover:text-paper md:bottom-8 md:right-8',
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
