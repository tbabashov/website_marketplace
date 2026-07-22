import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { ManagedImage } from '@/components/media/ManagedImage';
import { Arrow } from '@/components/ui/Button';
import { formatAzn, formatSecondary, pickText } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useSaved } from '@/store/ui';
import type { Locale } from '@/config/site';
import type { Listing } from '@/types/db';

function BookmarkButton({ listingId }: { listingId: string }) {
  const { t } = useTranslation();
  const userId = useAuth((s) => s.user?.id ?? null);
  const saved = useSaved((s) => s.ids.includes(listingId));
  const toggle = useSaved((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={() => void toggle(listingId, userId)}
      aria-pressed={saved}
      aria-label={t('profile.savedSites')}
      className={clsx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border transition-colors',
        saved
          ? 'border-cyan/60 text-cyan'
          : 'border-rule-soft text-bone-faint hover:border-rule hover:text-bone',
      )}
    >
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path
          d="M4 2h8v12l-4-3.2L4 14z"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="miter"
        />
      </svg>
    </button>
  );
}

/**
 * Listings read as rows in a parts catalogue — thumbnail, specification,
 * price — rather than as another card grid. The page above already uses a grid
 * for portfolio plates, and a marketplace where you compare prices wants a
 * column you can run your eye down.
 */
export function ListingRow({ listing }: { listing: Listing }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const secondary = formatSecondary(listing.price_azn, locale);
  const sold = listing.status === 'sold';

  return (
    <article className="group border-b border-rule-soft py-8 first:border-t">
      <div className="grid gap-6 md:grid-cols-[13rem_1fr_auto] md:items-start md:gap-8">
        {/* The title link below is the accessible target for this row; the
            thumbnail is the same destination, so it is hidden from assistive
            tech rather than announced twice. */}
        <Link to={`/marketplace/${listing.slug}`} tabIndex={-1} aria-hidden="true" className="block">
          <ManagedImage
            slotId={`marketplace-${listing.slug}-cover`}
            src={listing.cover_image}
            alt=""
            aspect="16:10"
            label={listing.slug}
            className="border border-rule-soft transition-colors group-hover:border-rule"
          />
        </Link>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-h3 text-bone">
              <Link
                to={`/marketplace/${listing.slug}`}
                className="transition-colors hover:text-cyan-bright"
              >
                {pickText(listing.title, locale)}
              </Link>
            </h3>
            <BookmarkButton listingId={listing.id} />
          </div>

          <p className="mt-2 max-w-xl text-bone-mute">{pickText(listing.tagline, locale)}</p>

          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
            {listing.page_count !== null && (
              <div className="flex items-baseline gap-2">
                <dt className="spec text-bone-faint">{t('market.pages')}</dt>
                <dd className="font-mono text-xs text-bone tabular-nums">{listing.page_count}</dd>
              </div>
            )}
            {listing.stack.length > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="spec text-bone-faint">{t('market.stack')}</dt>
                <dd className="font-mono text-xs text-bone">{listing.stack.join(' · ')}</dd>
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <dt className="spec text-bone-faint">{t('market.license')}</dt>
              <dd className="font-mono text-xs text-bone">{t('market.licenseSingle')}</dd>
            </div>
          </dl>
        </div>

        <div className="flex items-end justify-between gap-6 md:min-w-[11rem] md:flex-col md:items-end">
          <div className="text-right">
            <p className="font-display text-h2 text-bone tabular-nums">
              {formatAzn(listing.price_azn, locale)}
            </p>
            {secondary && <p className="spec mt-1 text-bone-faint">≈ {secondary}</p>}
          </div>

          {sold ? (
            <span className="spec border border-rule px-3 py-2 text-bone-faint">
              {t('market.sold')}
            </span>
          ) : (
            <Link
              to={`/marketplace/${listing.slug}`}
              className="spec inline-flex items-center gap-2 text-cyan transition-colors hover:text-cyan-bright"
            >
              {t('market.buy')}
              <Arrow />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
