import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { aspectValue, getSlot, placeholderTone } from '@/lib/images';
import type { Locale } from '@/config/site';

interface ManagedImageProps {
  /** Manifest slot id. Supplies the path, crop, and alt text in all three languages. */
  slotId?: string;
  /** Overrides the manifest path — used for database-driven covers. */
  src?: string | null;
  /** Overrides the manifest alt text. */
  alt?: string;
  /** Overrides the manifest crop, e.g. "3:2". */
  aspect?: string;
  className?: string;
  /** Above the fold: skip lazy loading and decode synchronously. */
  priority?: boolean;
  /** Shown centred on the placeholder. Falls back to the slot id. */
  label?: string;
}

/**
 * An image slot that looks finished whether or not the file exists yet.
 *
 * Until the Owner drops a real file at `expected_path`, this renders a duotone
 * plate at exactly the final crop, with the drafting hatch and a small caption
 * — the same visual language as the rest of the site, so an unfilled slot
 * reads as "not plated yet" rather than as a broken build. The moment a
 * matching file appears in /public, it fades in over the placeholder with no
 * code change.
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
  const altText = alt ?? (slot ? slot.alt_text[locale] ?? slot.alt_text.en : '');

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
      className={clsx('relative overflow-hidden bg-ink-deep', className)}
      style={{ aspectRatio: aspectValue(ratio) }}
    >
      <div
        aria-hidden="true"
        className={clsx(
          'absolute inset-0 transition-opacity duration-500',
          showPlaceholder ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          backgroundImage: `
            repeating-linear-gradient(135deg, rgb(255 255 255 / 0.022) 0 1px, transparent 1px 7px),
            linear-gradient(142deg, ${tone.from}, ${tone.to})
          `,
        }}
      >
        <div className="absolute inset-3 border border-rule-soft" />
        {caption && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
            <span className="spec text-bone-faint/70">{caption}</span>
            <span className="spec text-bone-faint/40">{ratio}</span>
          </div>
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
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* A missing file is not an error the visitor caused, but a screen reader
          should still be told there is nothing here rather than nothing at all. */}
      {showPlaceholder && !path && (
        <span className="sr-only">{t('a11y.imagePlaceholder')}</span>
      )}
    </div>
  );
}
