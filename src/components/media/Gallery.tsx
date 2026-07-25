import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { ManagedImage } from '@/components/media/ManagedImage';
import { getSlot } from '@/lib/images';

export interface GalleryImage {
  /** Manifest slot id (for the cover), if any. */
  slotId?: string;
  /** Direct path; overrides the slot. Null renders a labelled placeholder. */
  src?: string | null;
  /** Caption shown on the placeholder — use it to name the file to drop in. */
  label: string;
  /** Alt text for the real image. */
  alt?: string;
}

/** The real file URL for an image, whether it came from a slot or a path. */
function sourceOf(img: GalleryImage): string | null {
  if (img.src) return img.src;
  if (img.slotId) return getSlot(img.slotId)?.expected_path ?? null;
  return null;
}

/**
 * A screenshot carousel for listing pages, built from the site's own parts —
 * rounded plate, cobalt accents, the same ManagedImage placeholders used
 * everywhere else — so it reads as custom, not a bolted-on slider.
 *
 * One image at a time slides in a masked track; arrows wrap around; dots below
 * jump directly and show position out of the total. Clicking the image opens a
 * full-screen lightbox where the whole, uncropped shot can be inspected — with
 * its own arrows, dots, backdrop-to-close and Escape. Arrow keys and touch
 * swipe drive both. A single image keeps only the click-to-expand.
 */
export function Gallery({
  images,
  aspect = '16:10',
  className,
}: {
  images: GalleryImage[];
  aspect?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const count = images.length;
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  // Escape closes the lightbox; left/right navigate (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
        return;
      }
      if (count <= 1) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // Lock the page behind the lightbox, and move focus into it.
  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [expanded]);

  if (count === 0) return null;

  function onPointerDown(e: React.PointerEvent) {
    swipeStart.current = e.clientX;
    swiped.current = false;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > 45) {
      swiped.current = true; // suppress the click that follows a swipe
      go(dx < 0 ? 1 : -1);
    }
  }
  function onImageClick() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setExpanded(true);
  }

  const arrowClass =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full ' +
    'bg-paper/85 text-ink shadow-[0_6px_24px_-8px_rgba(18,18,16,0.4)] backdrop-blur-sm transition ' +
    'hover:bg-blue hover:text-paper ' +
    'opacity-100 lg:opacity-0 lg:group-hover/gallery:opacity-100';

  const current = images[index]!;
  const currentSrc = sourceOf(current);

  return (
    <div className={clsx('group/gallery', className)}>
      {/* Masked track. Dark frame so screenshots that aren't a perfect crop
          show whole (object-contain) with clean black bars instead of being
          sliced off. */}
      <div
        className="plate relative bg-night"
        style={{ aspectRatio: aspect.split(':').join(' / ') }}
        role="group"
        aria-roledescription="carousel"
        aria-label={t('market.screenshots')}
      >
        <button
          type="button"
          onClick={onImageClick}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          data-cursor="view"
          data-cursor-label={t('market.enlarge')}
          aria-label={t('market.enlarge')}
          className="absolute inset-0 block cursor-zoom-in touch-pan-y overflow-hidden"
        >
          <div
            className="flex h-full w-full transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {images.map((img, i) => (
              <div key={img.label + i} className="h-full w-full shrink-0" aria-hidden={i !== index}>
                <ManagedImage
                  slotId={img.slotId}
                  src={img.src}
                  alt={img.alt}
                  aspect={aspect}
                  label={img.label}
                  priority={i === 0}
                  fit="contain"
                  className="h-full w-full !rounded-none bg-night"
                />
              </div>
            ))}
          </div>
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              data-cursor="link"
              onClick={() => go(-1)}
              aria-label={t('common.back')}
              className={clsx(arrowClass, 'left-3')}
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              data-cursor="link"
              onClick={() => go(1)}
              aria-label={t('common.next')}
              className={clsx(arrowClass, 'right-3')}
            >
              <Chevron dir="right" />
            </button>

            <span className="label pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-paper tabular-nums">
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
          </>
        )}
      </div>

      {/* Dots */}
      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.label + i}
              type="button"
              data-cursor="link"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1} / ${count}`}
              aria-current={i === index}
              className={clsx(
                'h-2 rounded-full transition-all duration-300',
                i === index ? 'w-6 bg-blue' : 'w-2 bg-ink/20 hover:bg-ink/40',
              )}
            />
          ))}
        </div>
      )}

      {/* Lightbox — portalled to <body> so it escapes the main content's
          stacking context and actually sits above the fixed header. */}
      {expanded &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('market.screenshots')}
            data-cursor-on-dark
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5 bg-night/95 p-4 backdrop-blur-sm sm:p-8"
            style={{ animation: 'fade 0.22s var(--ease-out-expo)' }}
          >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setExpanded(false)}
            aria-label={t('common.close')}
            data-cursor="link"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20"
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
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div
            className="relative flex w-full max-w-6xl flex-1 items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {currentSrc ? (
              <img
                src={currentSrc}
                alt={current.alt ?? ''}
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <p className="label text-paper/50">{current.label}</p>
            )}

            {count > 1 && (
              <>
                <button
                  type="button"
                  data-cursor="link"
                  onClick={() => go(-1)}
                  aria-label={t('common.back')}
                  className="absolute left-1 flex h-12 w-12 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20 sm:left-2"
                >
                  <Chevron dir="left" />
                </button>
                <button
                  type="button"
                  data-cursor="link"
                  onClick={() => go(1)}
                  aria-label={t('common.next')}
                  className="absolute right-1 flex h-12 w-12 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20 sm:right-2"
                >
                  <Chevron dir="right" />
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {images.map((img, i) => (
                <button
                  key={img.label + i}
                  type="button"
                  data-cursor="link"
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1} / ${count}`}
                  aria-current={i === index}
                  className={clsx(
                    'h-2 rounded-full transition-all duration-300',
                    i === index ? 'w-6 bg-paper' : 'w-2 bg-paper/30 hover:bg-paper/50',
                  )}
                />
              ))}
            </div>
          )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}
