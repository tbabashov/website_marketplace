import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import { ManagedImage } from '@/components/media/ManagedImage';
import { formatAzn, formatSecondary, pickText } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useSaved } from '@/store/ui';
import type { Locale } from '@/config/site';
import type { Listing } from '@/types/db';

function Bookmark({ listingId, tone }: { listingId: string; tone: 'ink' | 'paper' }) {
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
      data-cursor="link"
      className={clsx(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
        saved
          ? 'bg-blue text-paper'
          : tone === 'paper'
            ? 'bg-paper/10 text-paper/60 hover:bg-paper/20 hover:text-paper'
            : 'bg-paper-2 text-ink-mute hover:bg-paper-3 hover:text-ink',
      )}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M4 2.5h8v11l-4-3.4-4 3.4z"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * A marketplace card. Renders on either ground: `tone="paper"` for the
 * marketplace page, `tone="night"` for the inverted band on the landing page.
 * Price is set in the display face at heading scale, because on a page where
 * everything is being compared, the number is the headline.
 */
export function ListingRow({
  listing,
  tone = 'ink',
}: {
  listing: Listing;
  tone?: 'ink' | 'paper';
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const secondary = formatSecondary(listing.price_azn, locale);
  const sold = listing.status === 'sold';
  const title = pickText(listing.title, locale);
  const onNight = tone === 'paper';

  return (
    <article className="group relative flex flex-col">
      <Link
        to={`/marketplace/${listing.slug}`}
        data-cursor="view"
        data-cursor-label={sold ? t('market.sold') : t('market.viewListing')}
        className="block rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-offset-8"
      >
        <div className="relative">
          <ManagedImage
            slotId={`marketplace-${listing.slug}-cover`}
            src={listing.cover_image}
            alt={title}
            aspect="4:3"
            label={listing.slug}
          />
          {sold && (
            <span className="label absolute left-5 top-5 rounded-full bg-ink px-3.5 py-2 text-paper">
              {t('market.sold')}
            </span>
          )}
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-5">
          <h3
            className={clsx(
              'text-d3 font-display transition-colors duration-300',
              onNight ? 'text-paper group-hover:text-blue-lift' : 'group-hover:text-blue',
            )}
          >
            {title}
          </h3>
          <span className="shrink-0 text-right">
            <span className={clsx('block text-d4 font-display', onNight ? 'text-paper' : 'text-ink')}>
              {formatAzn(listing.price_azn, locale)}
            </span>
            {secondary && (
              <span className={clsx('label block', onNight ? 'text-paper/40' : 'text-ink-faint')}>
                ≈ {secondary}
              </span>
            )}
          </span>
        </div>

        <p className={clsx('mt-2.5 max-w-md', onNight ? 'text-paper/60' : 'text-ink-soft')}>
          {pickText(listing.tagline, locale)}
        </p>
      </Link>

      <div className="mt-5 flex items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {listing.page_count !== null && (
            <span
              className={clsx(
                'label rounded-full px-3 py-1.5',
                onNight ? 'bg-paper/8 text-paper/55' : 'bg-paper-2 text-ink-mute',
              )}
            >
              {t('market.pages')} — {listing.page_count}
            </span>
          )}
          {listing.stack.slice(0, 2).map((tech) => (
            <span
              key={tech}
              className={clsx(
                'label rounded-full px-3 py-1.5',
                onNight ? 'bg-paper/8 text-paper/55' : 'bg-paper-2 text-ink-mute',
              )}
            >
              {tech}
            </span>
          ))}
        </div>
        <div className="ml-auto">
          <Bookmark listingId={listing.id} tone={tone} />
        </div>
      </div>
    </article>
  );
}
