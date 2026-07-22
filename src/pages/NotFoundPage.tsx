import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/Button';
import { useSeo } from '@/lib/seo';

/**
 * The 404 stays inside the drafting metaphor rather than stepping outside it
 * for a joke: a sheet with correct dimensions and nothing drawn on it.
 */
export default function NotFoundPage() {
  const { t } = useTranslation();
  useSeo({ title: `404 — WebSale.az`, description: t('notFound.body'), noindex: true });

  return (
    <div className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="dimline flex-1" />
          <span className="spec shrink-0 text-cyan">404</span>
          <span className="dimline flex-1" />
        </div>

        <div className="cropmarks mt-3 border border-rule px-8 py-20 text-center sm:px-14 sm:py-28">
          <h1 className="font-display text-h1 text-bone">{t('notFound.title')}</h1>
          <p className="mx-auto mt-5 max-w-md text-bone-mute">{t('notFound.body')}</p>
          <ButtonLink to="/" size="lg" className="mt-10">
            {t('notFound.action')}
          </ButtonLink>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="dimline flex-1" />
          <span className="spec shrink-0 text-bone-faint">0 × 0</span>
          <span className="dimline flex-1" />
        </div>
      </div>
    </div>
  );
}
