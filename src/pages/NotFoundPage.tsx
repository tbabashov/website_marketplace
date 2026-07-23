import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/Button';
import { Shell } from '@/components/ui/Bits';
import { useSeo } from '@/lib/seo';

export default function NotFoundPage() {
  const { t } = useTranslation();
  useSeo({ title: '404 — WebSale.az', description: t('notFound.body'), noindex: true });

  return (
    <div className="py-40 md:py-52">
      <Shell className="max-w-3xl text-center">
        <p className="font-display text-mega font-extrabold leading-none text-blue">404</p>
        <h1 className="mt-8 text-d2 font-display">{t('notFound.title')}</h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-soft">{t('notFound.body')}</p>
        <ButtonLink to="/" size="lg" className="mt-10" magnetic>
          {t('notFound.action')}
        </ButtonLink>
      </Shell>
    </div>
  );
}
