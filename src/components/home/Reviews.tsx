import { useTranslation } from 'react-i18next';

import { Eyebrow, Reveal, Shell, Stars } from '@/components/ui/Bits';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/config/site';
import type { Review } from '@/types/db';

/**
 * Reviews can only come from `submit_review()`, which refuses anything that is
 * not a completed, paid order belonging to the caller. So when this list is
 * empty the honest move is to say so and explain why — which is exactly what
 * the empty state does, in place of the three invented quotes that would
 * otherwise sit here.
 */
export function Reviews({ reviews }: { reviews: Review[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;

  return (
    <section className="py-24 md:py-32" aria-labelledby="reviews-heading">
      <Shell>
        <Eyebrow>{t('reviews.label')}</Eyebrow>
        <h2 id="reviews-heading" className="mt-8 max-w-3xl text-d1 font-display">
          {t('reviews.title')}
        </h2>

        {reviews.length === 0 ? (
          <Reveal className="mt-14">
            <div className="max-w-3xl rounded-3xl bg-paper-2 p-10 md:p-14">
              <p className="text-d3 font-display">{t('reviews.emptyTitle')}</p>
              <p className="mt-6 max-w-xl text-lg text-ink-soft">{t('reviews.emptyBody')}</p>
            </div>
          </Reveal>
        ) : (
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 6).map((review, i) => (
              <Reveal key={review.id} delay={i * 80}>
                <figure className="flex h-full flex-col rounded-3xl bg-paper-2 p-8">
                  <Stars rating={review.rating} className="text-ink" />
                  {review.body && (
                    <blockquote className="mt-6 flex-1 text-lg leading-relaxed">
                      “{review.body}”
                    </blockquote>
                  )}
                  <figcaption className="mt-8 flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-semibold">{review.author_name}</span>
                    <span className="text-ink-mute">{formatDate(review.created_at, locale)}</span>
                  </figcaption>
                  <span className="label mt-3 text-green">{t('reviews.verified')}</span>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </Shell>
    </section>
  );
}
