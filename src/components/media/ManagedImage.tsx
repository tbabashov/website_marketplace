import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { aspectValue, getSlot, placeholderTone } from '@/lib/images';
import type { Locale } from '@/config/site';

interface ManagedImageProps {
  /** Manifest slot id. Supplies path, crop and alt text in all three languages. */
  slotId?: string;
  /** Overrides the manifest path — used for database-driven covers. */
  src?: string | null;
  /** Overrides the manifest alt text. */
  alt?: string;
  /** Overrides the manifest crop, e.g. "3:2". */
  aspect?: string;
  className?: string;
  /** Above the fold: skip lazy loading and decode eagerly. */
  priority?: boolean;
  /** Small caption on the placeholder. Pass "" to show none. */
  label?: string;
}

/**
 * An image slot that looks finished whether or not the file exists yet.
 *
 * Until a real file is dropped at `expected_path`, this renders a soft
 * two-stop wash cropped to the exact final dimensions, with a faint cobalt
 * corner mark — so an unfilled slot reads as a considered surface rather than
 * a broken build. The moment a matching file appears in /public it fades in
 * over the top, with no code change.
 */
export function ManagedImage({
  slotId,
  src,
  alt,
  aspect,
  className,
  priority = false,
  label,
}: ManagedImageProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language as Locale;

  const slot = slotId ? getSlot(slotId) : undefined;
  const path = src ?? slot?.expected_path ?? null;
  const ratio = aspect ?? slot?.aspect_ratio ?? '16:9';
  const altText = alt ?? (slot ? (slot.alt_text[locale] ?? slot.alt_text.en) : '');

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // A changed path is a different image: forget whatever the last one did.
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [path]);

  const tone = placeholderTone(slotId ?? path ?? 'slot');
  const showPlaceholder = !path || failed || !loaded;
  const caption = label ?? slotId ?? '';

  return (
    <div
      className={clsx('plate', className)}
      style={{ aspectRatio: aspectValue(ratio) }}
    >
      <div
        aria-hidden="true"
        className={clsx(
          'plate-fill absolute inset-0 transition-opacity duration-700',
          showPlaceholder ? 'opacity-100' : 'opacity-0',
        )}
        style={{ backgroundImage: `linear-gradient(148deg, ${tone.from}, ${tone.to})` }}
      >
        <span
          className="absolute left-5 top-5 h-6 w-6 rounded-tl-md border-l-2 border-t-2"
          style={{ borderColor: 'rgb(27 51 224 / 0.22)' }}
        />
        {caption && (
          <span className="label absolute bottom-5 left-5 text-ink/25">{caption}</span>
        )}
      </div>

      {path && !failed && (
        <img
          src={path}
          alt={altText}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={clsx(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* A missing file is not the visitor's fault, but a screen reader should
          still be told there is nothing here rather than nothing at all. */}
      {showPlaceholder && !path && <span className="sr-only">{t('a11y.imagePlaceholder')}</span>}
    </div>
  );
}
