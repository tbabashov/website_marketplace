import { useTranslation } from 'react-i18next';

import { Reveal, SectionLabel, Stars } from '@/components/ui/Bits';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/config/site';
import type { Review } from '@/types/db';

/**
 * Reviews only ever come from `submit_review()`, which refuses anything that
 * is not a completed, paid order belonging to the caller. So when this list is
 * empty the honest thing is to say the section is empty and explain why —
 * which is what the empty state does, in place of the three invented quotes
 * that would otherwise sit here.
 */
export function Reviews({ reviews }: { reviews: Review[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  return (
    <section className="border-t border-rule-soft px-5 py-24 sm:px-8" aria-labelledby="reviews-heading">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel>{t('reviews.label')}</SectionLabel>

        <h2 id="reviews-heading" className="mt-8 max-w-2xl font-display text-h1 text-bone">
          {t('reviews.title')}
        </h2>

        {reviews.length === 0 ? (
          <Reveal className="mt-12">
            <div className="max-w-2xl border-l-2 border-brass/40 bg-surface/40 py-8 pl-8 pr-6">
              <p className="font-display text-h3 text-bone">{t('reviews.emptyTitle')}</p>
              <p className="mt-4 text-bone-mute">{t('reviews.emptyBody')}</p>
            </div>
          </Reveal>
        ) : (
          <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 6).map((review, index) => (
              <Reveal key={review.id} delay={index * 60}>
                <figure className="flex h-full flex-col border-t border-rule pt-6">
                  <Stars rating={review.rating} />
                  {review.body && (
                    <blockquote className="mt-4 flex-1 font-display text-h4 leading-snug text-bone">
                      “{review.body}”
                    </blockquote>
                  )}
                  <figcaption className="mt-6 flex items-baseline justify-between gap-4">
                    <span className="text-sm text-bone-mute">{review.author_name}</span>
                    <span className="spec text-bone-faint">
                      {formatDate(review.created_at, locale)}
                    </span>
                  </figcaption>
                  <span className="spec mt-2 text-sage/80">{t('reviews.verified')}</span>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
